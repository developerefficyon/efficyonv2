/**
 * Test Upload Controller
 * Handles uploading JSON test data into workspaces and schema validation.
 * Admin-only — used by the internal testing system.
 */

const { supabase } = require("../config/supabase")
const { validateData, getSchema, listSchemas } = require("../services/schemaValidator")

/**
 * Upload data to a workspace
 */
async function uploadData(req, res) {
  try {
    const { id: workspaceId } = req.params
    const { filename, integration_label, data_type, file_data } = req.body

    if (!integration_label || !data_type || !file_data) {
      return res.status(400).json({ error: "Missing required fields: integration_label, data_type, file_data" })
    }

    // Verify workspace exists
    const { data: workspace, error: wsError } = await supabase
      .from("test_workspaces")
      .select("id")
      .eq("id", workspaceId)
      .single()

    if (wsError || !workspace) {
      return res.status(404).json({ error: "Workspace not found" })
    }

    // Validate data against schema
    const validationReport = validateData(integration_label, data_type, file_data)

    const { data, error } = await supabase
      .from("test_uploads")
      .insert({
        workspace_id: workspaceId,
        filename: filename || `${integration_label}_${data_type}.json`,
        integration_label,
        data_type,
        file_data,
        validation_status: validationReport.status,
        validation_report: validationReport,
        uploaded_by: req.user.id,
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.status(201).json({
      upload: {
        id: data.id,
        workspace_id: data.workspace_id,
        filename: data.filename,
        integration_label: data.integration_label,
        data_type: data.data_type,
        validation_status: data.validation_status,
        validation_report: data.validation_report,
        created_at: data.created_at,
      },
    })
  } catch (err) {
    console.error("uploadData error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * List uploads for a workspace
 */
async function listUploads(req, res) {
  try {
    const { id: workspaceId } = req.params

    const { data, error } = await supabase
      .from("test_uploads")
      .select("id, workspace_id, filename, integration_label, data_type, validation_status, validation_report, uploaded_by, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ uploads: data || [] })
  } catch (err) {
    console.error("listUploads error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Get a single upload with full data
 */
async function getUpload(req, res) {
  try {
    const { uploadId } = req.params

    const { data, error } = await supabase
      .from("test_uploads")
      .select("*")
      .eq("id", uploadId)
      .single()

    if (error || !data) {
      return res.status(404).json({ error: "Upload not found" })
    }

    res.json({ upload: data })
  } catch (err) {
    console.error("getUpload error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Delete an upload
 */
async function deleteUpload(req, res) {
  try {
    const { uploadId } = req.params

    const { error } = await supabase
      .from("test_uploads")
      .delete()
      .eq("id", uploadId)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ message: "Upload deleted" })
  } catch (err) {
    console.error("deleteUpload error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Re-validate an upload against its schema
 */
async function revalidateUpload(req, res) {
  try {
    const { uploadId } = req.params

    const { data: upload, error: fetchError } = await supabase
      .from("test_uploads")
      .select("*")
      .eq("id", uploadId)
      .single()

    if (fetchError || !upload) {
      return res.status(404).json({ error: "Upload not found" })
    }

    const validationReport = validateData(upload.integration_label, upload.data_type, upload.file_data)

    const { error: updateError } = await supabase
      .from("test_uploads")
      .update({
        validation_status: validationReport.status,
        validation_report: validationReport,
      })
      .eq("id", uploadId)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    res.json({ validation: validationReport })
  } catch (err) {
    console.error("revalidateUpload error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

/**
 * Get expected schema for an integration type
 */
async function getSchemaInfo(req, res) {
  try {
    const { integration } = req.params

    if (integration === "all") {
      return res.json({ schemas: listSchemas() })
    }

    const schema = getSchema(integration, req.query.data_type)
    if (!schema && !req.query.data_type) {
      // Return all data types for this integration
      const allSchemas = listSchemas()
      const types = allSchemas[integration]
      if (!types) {
        return res.status(404).json({ error: `Unknown integration: ${integration}` })
      }
      const result = {}
      types.forEach((t) => {
        result[t] = getSchema(integration, t)
      })
      return res.json({ integration, schemas: result })
    }

    if (!schema) {
      return res.status(404).json({ error: `Unknown schema for ${integration}/${req.query.data_type}` })
    }

    res.json({ integration, data_type: req.query.data_type, schema })
  } catch (err) {
    console.error("getSchemaInfo error:", err)
    res.status(500).json({ error: "Internal server error" })
  }
}

module.exports = {
  uploadData,
  listUploads,
  getUpload,
  deleteUpload,
  revalidateUpload,
  getSchemaInfo,
}
