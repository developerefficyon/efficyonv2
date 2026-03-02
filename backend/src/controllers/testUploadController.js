/**
 * Test Upload Controller
 * Handles uploading JSON test data into workspaces and schema validation.
 * Admin-only — used by the internal testing system.
 */

const { supabase } = require("../config/supabase")
const { validateData, getSchema, listSchemas } = require("../services/schemaValidator")
const { parseUploadedFile, detectDataSchema, mapToAnalysisFormat } = require("../services/fileParsingService")

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

/**
 * Upload a file (CSV, Excel, PDF, JPEG) to a workspace via drag & drop or API.
 * Parses the file, auto-detects schema, maps data, and stores in test_uploads.
 */
async function uploadFile(req, res) {
  try {
    const { id: workspaceId } = req.params
    const { fileData, fileName, mimeType, integrationHint, dataTypeHint } = req.body

    if (!fileData || !fileName) {
      return res.status(400).json({ error: "Missing required fields: fileData, fileName" })
    }

    // Validate file extension
    const ext = fileName.substring(fileName.lastIndexOf(".")).toLowerCase()
    const ALLOWED = [".csv", ".xlsx", ".xls", ".pdf", ".jpeg", ".jpg", ".png"]
    if (!ALLOWED.includes(ext)) {
      return res.status(400).json({
        error: `Unsupported file type: ${ext}. Allowed: ${ALLOWED.join(", ")}`,
      })
    }

    // Validate file size (base64 is ~33% larger than raw)
    const rawSize = Buffer.byteLength(fileData, "base64")
    if (rawSize > 15 * 1024 * 1024) {
      return res.status(400).json({ error: "File too large. Maximum: 15MB" })
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

    // 1. Parse the file
    let parsedFile = parseUploadedFile(fileData, fileName, mimeType)
    // Handle async parsers (PDF, image)
    if (parsedFile && typeof parsedFile.then === "function") {
      parsedFile = await parsedFile
    }

    if (parsedFile.error && !parsedFile.sheets && !parsedFile.extractedTables) {
      return res.status(422).json({
        error: `File parsing failed: ${parsedFile.error}`,
        parsedFile,
      })
    }

    // 2. Detect schema
    const detection = detectDataSchema(parsedFile)

    // Allow user hints to override low-confidence detection
    let finalSchema = detection.detectedSchema
    if (integrationHint && detection.confidence < 0.5) {
      const hintMap = { Fortnox: "fortnox", Microsoft365: "m365", HubSpot: "hubspot" }
      finalSchema = hintMap[integrationHint] || finalSchema
    }

    // 3. Map schema to integration_label and data_type for test_uploads
    const schemaToIntegration = {
      fortnox: "Fortnox",
      m365: "Microsoft365",
      hubspot: "HubSpot",
      generic: integrationHint || "Fortnox",
    }
    const schemaToDataType = {
      fortnox: dataTypeHint || "supplier_invoices",
      m365: dataTypeHint || "licenses",
      hubspot: dataTypeHint || "hubspot_users",
      generic: dataTypeHint || "supplier_invoices",
    }

    const integrationLabel = schemaToIntegration[finalSchema] || "Fortnox"
    const dataType = schemaToDataType[finalSchema] || "supplier_invoices"

    // 4. Get rows from parsed data
    const rows = getRowsFromParsed(parsedFile)

    // 5. Map to analysis format
    const mappedData = mapToAnalysisFormat(rows, finalSchema, detection.columnMapping)

    // 6. Determine what to store in file_data
    let fileDataToStore
    if (finalSchema === "fortnox" && mappedData) {
      fileDataToStore = mappedData.supplierInvoices?.length > 0
        ? mappedData.supplierInvoices
        : mappedData.invoices?.length > 0
          ? mappedData.invoices
          : rows
    } else if (finalSchema === "m365" && mappedData) {
      if (dataType === "users" && mappedData.users?.length > 0) {
        fileDataToStore = mappedData.users
      } else if (mappedData.licenses?.length > 0) {
        fileDataToStore = mappedData.licenses
      } else {
        fileDataToStore = mappedData.users?.length > 0 ? mappedData.users : rows
      }
    } else if (finalSchema === "hubspot" && mappedData) {
      fileDataToStore = mappedData.users?.length > 0 ? mappedData.users : rows
    } else {
      fileDataToStore = rows
    }

    // 7. Validate against schema
    const validationReport = validateData(integrationLabel, dataType, fileDataToStore)

    // 8. Store in test_uploads
    const { data, error } = await supabase
      .from("test_uploads")
      .insert({
        workspace_id: workspaceId,
        filename: fileName,
        integration_label: integrationLabel,
        data_type: dataType,
        file_data: fileDataToStore,
        validation_status: validationReport.status,
        validation_report: {
          ...validationReport,
          fileType: parsedFile.type,
          detectedSchema: finalSchema,
          confidence: detection.confidence,
          columnMapping: detection.columnMapping,
          originalHeaders: detection.allHeaders,
          rowCount: rows.length,
        },
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
      detection: {
        schema: finalSchema,
        confidence: detection.confidence,
        columnMapping: detection.columnMapping,
        headers: detection.allHeaders,
        rowCount: rows.length,
      },
    })
  } catch (err) {
    console.error("uploadFile error:", err)
    res.status(500).json({ error: err.message || "Internal server error" })
  }
}

/**
 * Extract rows from any parsed file format
 */
function getRowsFromParsed(parsedFile) {
  if (parsedFile.sheets && parsedFile.sheets.length > 0) {
    return parsedFile.sheets[0].rows || []
  }
  if (parsedFile.extractedTables && parsedFile.extractedTables.length > 0) {
    return parsedFile.extractedTables[0].rows || []
  }
  return []
}

module.exports = {
  uploadData,
  uploadFile,
  listUploads,
  getUpload,
  deleteUpload,
  revalidateUpload,
  getSchemaInfo,
}
