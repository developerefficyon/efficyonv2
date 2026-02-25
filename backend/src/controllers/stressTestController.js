/**
 * Stress Test Controller
 * Generates adversarial data and uploads it to a workspace.
 * Admin-only — used by the internal testing system.
 */

const { supabase } = require("../config/supabase")
const { generateStressData, STRESS_SCENARIOS } = require("../services/stressTestGenerator")
const { validateData } = require("../services/schemaValidator")

/**
 * Generate stress test data and upload to workspace
 * POST /api/test/workspaces/:id/stress-test
 */
async function generateStressTestData(req, res) {
  try {
    const { id: workspaceId } = req.params
    const { integrations, scenarios, options } = req.body

    if (!integrations || !Array.isArray(integrations) || integrations.length === 0) {
      return res.status(400).json({ error: "integrations is required (array)" })
    }

    if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({ error: "scenarios is required (array of stress scenario keys)" })
    }

    const validIntegrations = ["Fortnox", "Microsoft365", "HubSpot"]
    const invalidIntegrations = integrations.filter((i) => !validIntegrations.includes(i))
    if (invalidIntegrations.length > 0) {
      return res.status(400).json({ error: `Invalid integrations: ${invalidIntegrations.join(", ")}` })
    }

    // Verify workspace exists
    const { data: workspace, error: wsError } = await supabase
      .from("test_workspaces")
      .select("id, metadata")
      .eq("id", workspaceId)
      .single()

    if (wsError || !workspace) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    const createdUploads = []

    for (const integration of integrations) {
      const { dataByType, stressProfile } = generateStressData(integration, scenarios, options || {})

      for (const [dataType, fileData] of Object.entries(dataByType)) {
        const validationReport = validateData(integration, dataType, fileData)

        const { data: upload, error: insertError } = await supabase
          .from("test_uploads")
          .insert({
            workspace_id: workspaceId,
            filename: `stress_${integration.toLowerCase()}_${dataType}.json`,
            integration_label: integration,
            data_type: dataType,
            file_data: fileData,
            validation_status: validationReport.status,
            validation_report: validationReport,
            uploaded_by: req.user.id,
          })
          .select("id, filename, integration_label, data_type, validation_status, created_at")
          .single()

        if (insertError) {
          console.error(`Failed to insert stress upload ${integration}/${dataType}:`, insertError.message)
          continue
        }

        createdUploads.push(upload)
      }
    }

    // Persist stress config to workspace metadata
    await supabase
      .from("test_workspaces")
      .update({
        metadata: {
          ...(workspace.metadata || {}),
          last_stress_test: {
            scenarios,
            integrations,
            options: options || {},
            generated_at: new Date().toISOString(),
            upload_ids: createdUploads.map((u) => u.id),
          },
        },
      })
      .eq("id", workspaceId)

    res.status(201).json({
      message: `Generated ${createdUploads.length} stress test uploads`,
      uploads: createdUploads,
      scenarios,
    })
  } catch (err) {
    console.error("generateStressTestData error:", err)
    res.status(500).json({ error: err.message || "Internal server error" })
  }
}

/**
 * List available stress scenarios
 * GET /api/test/stress-scenarios
 */
async function listStressScenarios(req, res) {
  res.json({ scenarios: STRESS_SCENARIOS })
}

module.exports = { generateStressTestData, listStressScenarios }
