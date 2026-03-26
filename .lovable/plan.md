

# Fix: Drag-and-Drop CSV Upload

## Problem
The upload zone says "Drop a CSV file or click to browse" but only click works. Dragging a file onto it triggers the browser's default behavior (download/open) because there are no drag event handlers.

## Fix — `src/pages/ImportPage.tsx`

1. Add `onDragOver` handler on the label element that calls `e.preventDefault()` and `e.stopPropagation()` to suppress browser default behavior.

2. Add `onDrop` handler that:
   - Calls `e.preventDefault()` and `e.stopPropagation()`
   - Extracts `e.dataTransfer.files[0]`
   - Validates it's a `.csv` file
   - Passes it to the same `Papa.parse` logic already in `handleFileUpload`

3. Extract the shared CSV parsing logic into a `processFile(file: File)` function so both the `<input onChange>` and the `onDrop` handler can call it.

4. Add a `dragging` state boolean to show a visual highlight (e.g. `border-primary bg-primary/5`) when a file is dragged over the zone, using `onDragEnter`/`onDragLeave` to toggle it.

## Files Modified
- `src/pages/ImportPage.tsx`

