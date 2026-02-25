/**
 * Continuous Improvement Loop
 * Orchestrates the full cycle: generate → upload → analyze → score → AI evaluate → compare → improve.
 * This is the core automation that makes the testing system self-improving.
 */

const { supabase } = require("../config/supabase")
const { generateAllData } = require("./mockDataGenerator")
const { validateData } = require("./schemaValidator")
const { runTestAnalysis, logTestRun } = require("./testAnalysisRunner")
const { computeDetectionScore, buildScoringPayload } = require("./analysisScoringService")
const claudeService = require("./claudeService")
const { compareAnalyses } = require("./comparativeAnalysisService")

/**
 * Run one full improvement cycle
 *
 * @param {Object} params
 * @param {string} params.workspaceId - Workspace to run in
 * @param {string} params.scenarioProfile - Scenario profile (startup_60, agency_25, scaleup_200)
 * @param {string[]} params.integrations - Which integrations to include
 * @param {Object} params.anomalyConfig - Anomaly injection config
 * @param {string|null} params.templateId - Template to use for analysis
 * @param {string} params.userId - Who initiated the cycle
 * @param {boolean} params.autoApplyTweaks - Whether to auto-apply template improvements
 * @param {number} params.maxIterations - Max re-run iterations (default 1)
 * @returns {Object} Full cycle report
 */
async function runImprovementCycle(params) {
  const {
    workspaceId,
    scenarioProfile = "startup_60",
    integrations = ["Fortnox", "Microsoft365", "HubSpot"],
    anomalyConfig = {},
    templateId = null,
    userId,
    autoApplyTweaks = false,
    maxIterations = 1,
  } = params

  const cycleReport = {
    workspaceId,
    iterations: [],
    startedAt: new Date().toISOString(),
    status: "running",
  }

  let currentTemplateId = templateId
  let previousAnalysisResult = null

  await logTestRun(workspaceId, null, "info", `Starting improvement cycle (${maxIterations} max iterations)`, {
    integrations,
    scenarioProfile,
    autoApplyTweaks,
  })

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const iterationReport = {
      iteration: iteration + 1,
      startedAt: new Date().toISOString(),
      steps: {},
    }

    try {
      // ── Step 1: Generate mock data ──
      const generatedData = generateAllData(scenarioProfile, {}, anomalyConfig, integrations)

      const uploadIds = []
      for (const [integrationLabel, dataByType] of Object.entries(generatedData)) {
        for (const [dataType, fileData] of Object.entries(dataByType)) {
          const validationReport = validateData(integrationLabel, dataType, fileData)

          const { data: upload, error: insertError } = await supabase
            .from("test_uploads")
            .insert({
              workspace_id: workspaceId,
              filename: `cycle_${iteration + 1}_${integrationLabel.toLowerCase()}_${dataType}.json`,
              integration_label: integrationLabel,
              data_type: dataType,
              file_data: fileData,
              validation_status: validationReport.status,
              validation_report: validationReport,
              uploaded_by: userId,
            })
            .select("id")
            .single()

          if (!insertError && upload) {
            uploadIds.push(upload.id)
          }
        }
      }

      iterationReport.steps.generate = { uploadCount: uploadIds.length, status: "completed" }

      // Persist anomaly config to workspace metadata
      await supabase
        .from("test_workspaces")
        .update({
          metadata: {
            last_mock_generation: {
              anomaly_config: anomalyConfig,
              integrations,
              generated_at: new Date().toISOString(),
              upload_ids: uploadIds,
            },
          },
        })
        .eq("id", workspaceId)

      // ── Step 2: Run analysis ──
      let template = null
      if (currentTemplateId) {
        const { data: tmpl } = await supabase
          .from("analysis_templates")
          .select("*")
          .eq("id", currentTemplateId)
          .single()
        template = tmpl
      }

      const analysisResult = await runTestAnalysis(workspaceId, {
        analysisType: "standard",
        integrationLabels: integrations,
        options: {},
        template,
        userId,
      })

      iterationReport.steps.analyze = {
        analysisId: analysisResult.analysisId,
        durationMs: analysisResult.durationMs,
        totalFindings: analysisResult.result.overallSummary?.totalFindings || 0,
        status: "completed",
      }

      // ── Step 3: Auto-score ──
      const detectionScore = computeDetectionScore(analysisResult.result, anomalyConfig)
      const scoring = buildScoringPayload(detectionScore, null)

      await supabase
        .from("test_analyses")
        .update({ scoring })
        .eq("id", analysisResult.analysisId)

      iterationReport.steps.score = {
        precision: detectionScore.detection.precision,
        recall: detectionScore.detection.recall,
        f1Score: detectionScore.detection.f1Score,
        status: "completed",
      }

      // ── Step 4: AI evaluation (if Claude configured) ──
      const aiEvaluation = await claudeService.generateFullEvaluation(
        analysisResult.result,
        anomalyConfig,
        scoring,
        template
      )

      if (aiEvaluation) {
        const updatedScoring = { ...scoring, aiEvaluation }
        await supabase
          .from("test_analyses")
          .update({ scoring: updatedScoring })
          .eq("id", analysisResult.analysisId)

        iterationReport.steps.aiEvaluate = {
          qualityScore: aiEvaluation.quality?.overallScore,
          improvementCount: aiEvaluation.improvements?.improvements?.length || 0,
          missedDiagnoses: aiEvaluation.missedDiagnosis?.diagnoses?.length || 0,
          status: "completed",
        }
      } else {
        iterationReport.steps.aiEvaluate = { status: "skipped", reason: "Claude not configured" }
      }

      // ── Step 5: Compare with previous iteration ──
      if (previousAnalysisResult) {
        // Fetch both full analysis records
        const { data: prevAnalysis } = await supabase
          .from("test_analyses")
          .select("*")
          .eq("id", previousAnalysisResult.analysisId)
          .single()

        const { data: currAnalysis } = await supabase
          .from("test_analyses")
          .select("*")
          .eq("id", analysisResult.analysisId)
          .single()

        if (prevAnalysis && currAnalysis) {
          const comparison = compareAnalyses([prevAnalysis, currAnalysis])
          iterationReport.steps.compare = {
            f1Delta: comparison.overallDelta?.f1Score,
            status: "completed",
          }
        }
      } else {
        iterationReport.steps.compare = { status: "skipped", reason: "First iteration" }
      }

      // ── Step 6: Optionally apply template tweaks ──
      if (autoApplyTweaks && aiEvaluation?.improvements?.improvements?.length > 0 && template) {
        const promptImprovements = aiEvaluation.improvements.improvements.filter(
          (imp) => imp.category === "prompt" || imp.category === "threshold"
        )

        if (promptImprovements.length > 0) {
          // Create a new template version with suggested changes
          const suggestedChanges = promptImprovements.map((i) => i.suggestedChange).join("\n\n")
          const newPromptLogic = `${template.ai_prompt_logic}\n\n--- AI-Suggested Additions (v${template.version + 1}) ---\n${suggestedChanges}`

          // Deactivate current version
          await supabase
            .from("analysis_templates")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", template.id)

          // Create new version
          const { data: newTemplate, error: tmplError } = await supabase
            .from("analysis_templates")
            .insert({
              slug: template.slug,
              name: template.name,
              version: template.version + 1,
              is_active: true,
              objective: template.objective,
              targeting_scope: template.targeting_scope,
              ai_prompt_logic: newPromptLogic,
              primary_kpi: template.primary_kpi,
              kpi_description: template.kpi_description,
              applicable_integrations: template.applicable_integrations,
              parameters: template.parameters,
              created_by: userId,
            })
            .select()
            .single()

          if (!tmplError && newTemplate) {
            currentTemplateId = newTemplate.id
            iterationReport.steps.applyTweaks = {
              newTemplateId: newTemplate.id,
              newVersion: newTemplate.version,
              changesApplied: promptImprovements.length,
              status: "completed",
            }
          } else {
            // Rollback: re-activate old version
            await supabase
              .from("analysis_templates")
              .update({ is_active: true })
              .eq("id", template.id)

            iterationReport.steps.applyTweaks = { status: "failed", error: tmplError?.message }
          }
        } else {
          iterationReport.steps.applyTweaks = { status: "skipped", reason: "No prompt/threshold improvements" }
        }
      } else {
        iterationReport.steps.applyTweaks = { status: "skipped", reason: autoApplyTweaks ? "No improvements or no template" : "Auto-apply disabled" }
      }

      iterationReport.completedAt = new Date().toISOString()
      iterationReport.scoring = iterationReport.steps.score
      previousAnalysisResult = analysisResult

      // Early termination checks
      if (detectionScore.detection.f1Score >= 0.95) {
        iterationReport.earlyStop = "F1 score >= 0.95, target reached"
        cycleReport.iterations.push(iterationReport)
        break
      }

      if (aiEvaluation && (!aiEvaluation.improvements?.improvements?.length)) {
        iterationReport.earlyStop = "No improvement suggestions remaining"
        cycleReport.iterations.push(iterationReport)
        break
      }
    } catch (err) {
      iterationReport.error = err.message
      iterationReport.completedAt = new Date().toISOString()
      await logTestRun(workspaceId, null, "error", `Iteration ${iteration + 1} failed: ${err.message}`)
    }

    cycleReport.iterations.push(iterationReport)
  }

  cycleReport.completedAt = new Date().toISOString()
  cycleReport.status = "completed"
  cycleReport.totalIterations = cycleReport.iterations.length

  // Compute overall improvement
  if (cycleReport.iterations.length >= 2) {
    const first = cycleReport.iterations[0]
    const last = cycleReport.iterations[cycleReport.iterations.length - 1]
    if (first.scoring && last.scoring) {
      cycleReport.overallImprovement = {
        f1Start: first.scoring.f1Score,
        f1End: last.scoring.f1Score,
        f1Delta: Math.round((last.scoring.f1Score - first.scoring.f1Score) * 10000) / 10000,
      }
    }
  }

  // Store cycle report in workspace metadata
  const { data: ws } = await supabase
    .from("test_workspaces")
    .select("metadata")
    .eq("id", workspaceId)
    .single()

  await supabase
    .from("test_workspaces")
    .update({
      metadata: {
        ...(ws?.metadata || {}),
        last_improvement_cycle: cycleReport,
      },
    })
    .eq("id", workspaceId)

  await logTestRun(workspaceId, null, "info", "Improvement cycle completed", {
    iterations: cycleReport.totalIterations,
    status: cycleReport.status,
    overallImprovement: cycleReport.overallImprovement,
  })

  return cycleReport
}

module.exports = { runImprovementCycle }
