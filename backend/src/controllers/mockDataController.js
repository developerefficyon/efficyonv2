const { supabase } = require("../config/supabase")
const { generateAllData } = require("../services/mockDataGenerator")
const { validateData } = require("../services/schemaValidator")

async function generateMockData(req, res) {
  try {
    const { id: workspaceId } = req.params
    const { integrations, anomaly_config, scenario_overrides } = req.body

    if (!integrations || !Array.isArray(integrations) || integrations.length === 0) {
      return res.status(400).json({ error: "integrations is required (array of integration labels)" })
    }

    const validIntegrations = ["Fortnox", "Microsoft365", "HubSpot"]
    const invalid = integrations.filter((i) => !validIntegrations.includes(i))
    if (invalid.length > 0) {
      return res.status(400).json({ error: `Invalid integrations: ${invalid.join(", ")}` })
    }

    // Verify workspace exists
    const { data: workspace, error: wsError } = await supabase
      .from("test_workspaces")
      .select("id, scenario_profile, metadata")
      .eq("id", workspaceId)
      .single()

    if (wsError || !workspace) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    // Generate data using workspace's scenario profile
    const generatedData = generateAllData(
      workspace.scenario_profile,
      scenario_overrides || {},
      anomaly_config || {},
      integrations
    )

    // Insert one test_upload per (integration, data_type) pair
    const createdUploads = []

    for (const [integrationLabel, dataByType] of Object.entries(generatedData)) {
      for (const [dataType, fileData] of Object.entries(dataByType)) {
        // Validate against schema
        const validationReport = validateData(integrationLabel, dataType, fileData)

        const { data: upload, error: insertError } = await supabase
          .from("test_uploads")
          .insert({
            workspace_id: workspaceId,
            filename: `mock_${integrationLabel.toLowerCase()}_${dataType}.json`,
            integration_label: integrationLabel,
            data_type: dataType,
            file_data: fileData,
            validation_status: validationReport.status,
            validation_report: validationReport,
            uploaded_by: req.user.id,
          })
          .select("id, filename, integration_label, data_type, validation_status, created_at")
          .single()

        if (insertError) {
          console.error(`Failed to insert mock upload ${integrationLabel}/${dataType}:`, insertError.message)
          continue
        }

        createdUploads.push(upload)
      }
    }

    // Persist anomaly config to workspace metadata for scoring
    await supabase
      .from("test_workspaces")
      .update({
        metadata: {
          ...(workspace.metadata || {}),
          last_mock_generation: {
            anomaly_config: anomaly_config || {},
            integrations,
            generated_at: new Date().toISOString(),
            upload_ids: createdUploads.map((u) => u.id),
          },
        },
      })
      .eq("id", workspaceId)

    res.status(201).json({
      message: `Generated ${createdUploads.length} mock data uploads`,
      uploads: createdUploads,
      scenario: workspace.scenario_profile,
    })
  } catch (err) {
    console.error("generateMockData error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = { generateMockData }
