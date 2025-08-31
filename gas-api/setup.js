/**
 * @OnlyCurrentDoc
 *
 * The above comment directs Apps Script to limit the scope of script authorization
 * to only the current document.
 */

/**
 * Sets up the spreadsheet with the required sheets and headers.
 * This is a utility function to be run manually once from the script editor.
 *
 * To run this:
 * 1. Open the Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. In the script editor, select 'setupSpreadsheet' from the function dropdown.
 * 4. Click 'Run'.
 */
// biome-ignore lint/correctness/noUnusedVariables: This function is intended to be run manually from the editor.
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const sheets = {
    Books: [
      'BookID',
      'ISBN',
      'Title',
      'Author',
      'TotalPages',
      'CoverImageURL',
      'Description',
      'RegisteredBy',
      'RegisteredAt',
    ],
    ReadingLogs: ['LogID', 'BookID', 'UserID', 'PageCount', 'LoggedAt'],
    ReadingStatus: [
      'StatusID',
      'UserID',
      'BookID',
      'CurrentPage',
      'Status',
      'LastUpdatedAt',
    ],
  };

  for (const sheetName in sheets) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log(`Created sheet: ${sheetName}`);

      const headers = sheets[sheetName];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      Logger.log(`Set headers for ${sheetName}`);
    } else {
      Logger.log(`Sheet "${sheetName}" already exists.`);
    }
  }

  // Clean up the default "Sheet1" if it exists and is empty
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (
    defaultSheet &&
    defaultSheet.getLastRow() === 0 &&
    ss.getSheets().length > 1
  ) {
    ss.deleteSheet(defaultSheet);
    Logger.log("Removed default 'Sheet1'.");
  }

  SpreadsheetApp.flush(); // Apply all pending spreadsheet changes
}
