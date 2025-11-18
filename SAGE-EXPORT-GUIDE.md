# Sage ACCPAC Export Guide

This guide explains how to configure and use the Sage ACCPAC export feature.

## Overview

The system exports approved time entries to CSV format compatible with Sage ACCPAC accounting software. The export includes configurable column mapping to match your Sage ACCPAC import requirements.

## Default Column Mapping

The default mapping includes:

- **Employee Code**: User ID
- **Project Code**: Project code
- **Task Code**: Task ID
- **Date**: Start date of time entry
- **Hours**: Duration in hours
- **Description**: Notes from time entry
- **Cost Center**: Project ID
- **Rate**: User hourly rate

## Configuring Export Mapping

### Via API

1. Get current mappings:
```
GET /api/export/mappings
```

2. Create new mapping (Admin only):
```
POST /api/export/mappings
{
  "name": "Custom Mapping",
  "columnMapping": {
    "Employee Code": "user_id",
    "Project Code": "project_code",
    "Date": "start_time",
    "Hours": "duration_hours",
    "Description": "notes"
  },
  "isDefault": false
}
```

### Available Field Mappings

- `user_id`: User ID
- `project_code`: Project code
- `project_id`: Project ID
- `task_id`: Task ID
- `start_time`: Start timestamp (formatted as date)
- `duration_hours`: Hours worked
- `notes`: Time entry notes
- `hourly_rate`: User hourly rate

## Exporting Data

### Via Web Interface

1. Navigate to "Export" section (Admin/Supervisor only)
2. Select date range
3. Optionally filter by project
4. Choose mapping configuration
5. Click "Export" to download CSV

### Via API

```
GET /api/export/sage?from=2024-01-01&to=2024-01-31&projectId=1
```

**Query Parameters:**
- `from`: Start date (ISO 8601)
- `to`: End date (ISO 8601)
- `projectId`: Filter by project (optional)
- `mappingId`: Use specific mapping (optional, uses default if not specified)

## Preview Before Export

Use the preview endpoint to verify data before exporting:

```
GET /api/export/sage/preview?from=2024-01-01&to=2024-01-31
```

## Importing into Sage ACCPAC

1. Export CSV from the system
2. Open Sage ACCPAC
3. Navigate to Time Entry Import
4. Select the exported CSV file
5. Map columns if needed (should match automatically)
6. Review and import

## CSV Format

The exported CSV follows this structure:

```csv
Employee Code,Project Code,Task Code,Date,Hours,Description,Cost Center,Rate
1,PROJ001,5,2024-01-15,8.00,Worked on feature,1,120.00
2,PROJ001,6,2024-01-15,7.50,Code review,1,150.00
```

## Troubleshooting

### Date Format Issues
- Ensure dates are in YYYY-MM-DD format
- Check timezone settings if dates appear incorrect

### Missing Data
- Verify time entries are approved (only approved entries are exported)
- Check date range includes desired entries
- Verify project filter if used

### Column Mapping Errors
- Review mapping configuration
- Ensure all required Sage ACCPAC columns are mapped
- Check field names match available options

## Best Practices

1. **Regular Exports**: Export data weekly or monthly
2. **Verify Data**: Always preview before exporting
3. **Backup**: Keep exported CSV files for records
4. **Mapping Updates**: Update mappings if Sage ACCPAC requirements change
5. **Date Ranges**: Use consistent date ranges for easier reconciliation

## Support

For export issues or custom mapping requirements, contact the development team.

