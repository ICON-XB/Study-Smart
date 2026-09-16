# Agentic Vision in Study-Smart

## The Core Concept
Agentic Vision goes beyond simple OCR. In Study-Smart Vision, the camera is treated as a sensory input for an intelligent study agent. The visual data actively influences the agent's reasoning, planning, and actions.

## The Loop
1. **Perceive:** ision.js uses OpenCV to assess document quality, detect boundaries, and correct perspective.
2. **Decide:** gent.js evaluates the OpenCV output. If blurred (Laplacian Variance < threshold), it decides to reject the scan.
3. **Act:** The agent requests a rescan or sends the optimized image to AWS for extraction.
4. **Evaluate:** The agent updates the local Study Plan based on the extracted concepts (e.g., increasing study time for weak subjects) and generates flashcards.

## Human in the Loop
The agent always presents its proposed changes to the student for approval (Approve & Integrate button) before permanently altering the local offline database.
