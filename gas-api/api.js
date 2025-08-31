// =================================================================
// Main Entry Point
// =================================================================

/**
 * Handles POST requests to the web app.
 * This function acts as the main router for all API actions.
 * @param {Object} e - The event parameter from the POST request.
 * @returns {ContentService.TextOutput} The JSON response.
 */
// biome-ignore lint/correctness/noUnusedVariables: This function is the entry point for the web app.
function doPost(e) {
  let response;
  try {
    const requestBody = JSON.parse(e.postData.contents);
    const { action, payload } = requestBody;

    if (!action) {
      throw new Error("Request must include an 'action'.");
    }

    // Route to the appropriate handler based on the action
    switch (action) {
      case 'registerBook':
        response = registerBook(payload);
        break;
      case 'recordProgress':
        response = recordProgress(payload);
        break;
      case 'searchBooks':
        response = searchBooks(payload);
        break;
      case 'getReadingStatus':
        response = getReadingStatus(payload);
        break;
      case 'getReadingStats':
        response = getReadingStats(payload);
        break;
      default:
        throw new Error(`Invalid action: ${action}`);
    }
  } catch (error) {
    // Return a JSON error message
    response = { status: 'error', message: error.message };
  }

  // Return the response as JSON
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

// =================================================================
// API Action Handlers
// =================================================================

/**
 * 1. Registers a new book.
 * @param {Object} payload - The payload for the action.
 * @returns {Object} The result of the operation.
 */
function registerBook(payload) {
  const { bookData, registeredBy } = payload;
  if (!bookData || !registeredBy) {
    throw new Error('Missing required fields for registerBook.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000); // Wait up to 30 seconds for the lock

  try {
    const booksSheet = getSheet('Books');
    const isbnList = booksSheet
      .getRange(2, 3, booksSheet.getLastRow(), 1)
      .getValues()
      .flat();

    if (bookData.isbn && isbnList.includes(bookData.isbn)) {
      return {
        status: 'error',
        message: 'A book with this ISBN already exists.',
      };
    }

    const bookId = generateUUID();
    const newRow = [
      bookId,
      bookData.isbn || '',
      bookData.title || '',
      (bookData.authors || []).join(', '),
      bookData.totalPages || 0,
      bookData.coverImageUrl || '',
      bookData.description || '',
      registeredBy,
      new Date().toISOString(),
    ];
    booksSheet.appendRow(newRow);

    return { status: 'success', bookId: bookId };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 2. Records reading progress.
 * @param {Object} payload - The payload for the action.
 * @returns {Object} The result of the operation.
 */
function recordProgress(payload) {
  const { userId, bookId, pagesRead, newCurrentPage, newStatus } = payload;
  if (
    !userId ||
    !bookId ||
    pagesRead === undefined ||
    newCurrentPage === undefined ||
    !newStatus
  ) {
    throw new Error('Missing required fields for recordProgress.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    // 1. Log the history
    const logsSheet = getSheet('ReadingLogs');
    logsSheet.appendRow([
      generateUUID(),
      bookId,
      userId,
      pagesRead,
      new Date().toISOString(),
    ]);

    // 2. Update the status
    const statusSheet = getSheet('ReadingStatus');
    const statusData = statusSheet.getDataRange().getValues();
    const _headers = statusData.shift();
    const userBookIndex = statusData.findIndex(
      (row) => row[1] === userId && row[2] === bookId,
    );

    if (userBookIndex !== -1) {
      // Update existing status
      const rowIndex = userBookIndex + 2; // +1 for 1-based index, +1 for header
      statusSheet.getRange(rowIndex, 4).setValue(newCurrentPage);
      statusSheet.getRange(rowIndex, 5).setValue(newStatus);
      statusSheet.getRange(rowIndex, 6).setValue(new Date().toISOString());
    } else {
      // Create new status
      const statusId = `${userId}:${bookId}`;
      statusSheet.appendRow([
        statusId,
        userId,
        bookId,
        newCurrentPage,
        newStatus,
        new Date().toISOString(),
      ]);
    }

    return { status: 'success' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 3. Searches for registered books by title.
 * @param {Object} payload - The payload for the action.
 * @returns {Array} A list of books formatted for autocomplete.
 */
function searchBooks(payload) {
  const { query } = payload;
  if (query === undefined) {
    throw new Error('Missing query for searchBooks.');
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = 'all_books_for_search';
  let books = JSON.parse(cache.get(cacheKey));

  if (!books) {
    const booksSheet = getSheet('Books');
    const bookData = booksSheet
      .getRange(2, 1, booksSheet.getLastRow() - 1, 4)
      .getValues();
    books = bookData.map((row) => ({
      bookId: row[0],
      title: row[2],
      author: row[3],
    }));
    cache.put(cacheKey, JSON.stringify(books), 300); // Cache for 5 minutes
  }

  const lowerCaseQuery = query.toLowerCase();
  const filteredBooks = books
    .filter((book) => book.title.toLowerCase().includes(lowerCaseQuery))
    .slice(0, 25) // Discord limit for autocomplete
    .map((book) => ({
      name: `${book.title} (${book.author})`,
      value: book.bookId,
    }));

  return filteredBooks;
}

/**
 * 4. Gets the current reading status for users.
 * @param {Object} payload - The payload for the action.
 * @returns {Array} A list of reading status objects.
 */
function getReadingStatus(payload) {
  const { userId } = payload;

  const statusSheet = getSheet('ReadingStatus');
  let statusData = statusSheet
    .getRange(2, 1, statusSheet.getLastRow() - 1, 6)
    .getValues();

  if (userId) {
    statusData = statusData.filter((row) => row[1] === userId);
  }

  if (statusData.length === 0) {
    return [];
  }

  // Get all book details for efficient lookup
  const books = getBooksAsDict();

  const results = statusData.map((row) => {
    const bookId = row[2];
    const bookDetails = books[bookId] || {};
    return {
      userId: row[1],
      bookId: bookId,
      currentPage: row[3],
      status: row[4],
      lastUpdatedAt: row[5],
      title: bookDetails.title,
      author: bookDetails.author,
      totalPages: bookDetails.totalPages,
      coverImageUrl: bookDetails.coverImageUrl,
    };
  });

  return results;
}

/**
 * 5. Gets reading statistics for users.
 * @param {Object} payload - The payload for the action.
 * @returns {Array} A list of statistics objects.
 */
function getReadingStats(payload) {
  const { userId, period } = payload;
  if (!period) {
    throw new Error('Period is required for getReadingStats.');
  }

  const logsSheet = getSheet('ReadingLogs');
  let logData = logsSheet
    .getRange(2, 1, logsSheet.getLastRow() - 1, 5)
    .getValues();

  // Filter by period
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === 'monthly') {
    logData = logData.filter((row) => new Date(row[4]) >= firstDayOfMonth);
  }

  // Filter by userId if provided
  if (userId) {
    logData = logData.filter((row) => row[2] === userId);
  }

  // Aggregate stats
  const statsByUser = logData.reduce((acc, row) => {
    const currentUserId = row[2];
    const pagesRead = row[3];
    if (!acc[currentUserId]) {
      acc[currentUserId] = { userId: currentUserId, totalPagesRead: 0 };
    }
    acc[currentUserId].totalPagesRead += pagesRead;
    return acc;
  }, {});

  // TODO: Add booksFinished count by cross-referencing with ReadingStatus sheet

  return Object.values(statsByUser);
}

// =================================================================
// Helper Functions
// =================================================================

/**
 * Gets a sheet by its name.
 * @param {string} name The name of the sheet.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} The sheet object.
 */
function getSheet(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

/**
 * Generates a UUID.
 * @returns {string} A UUID string.
 */
function generateUUID() {
  return Utilities.getUuid();
}

/**
 * Gets all books from the Books sheet and returns them as a dictionary
 * for quick lookups. Uses caching.
 * @returns {Object} A dictionary of book objects keyed by bookId.
 */
function getBooksAsDict() {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'all_books_as_dict';
  let booksDict = JSON.parse(cache.get(cacheKey));

  if (!booksDict) {
    const booksSheet = getSheet('Books');
    const bookData = booksSheet
      .getRange(2, 1, booksSheet.getLastRow() - 1, 9)
      .getValues();
    booksDict = bookData.reduce((acc, row) => {
      acc[row[0]] = {
        // bookId is the key
        title: row[2],
        author: row[3],
        totalPages: row[4],
        coverImageUrl: row[5],
      };
      return acc;
    }, {});
    cache.put(cacheKey, JSON.stringify(booksDict), 300); // Cache for 5 minutes
  }
  return booksDict;
}
