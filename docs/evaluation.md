# Evaluation Framework

## OpenCV Metrics
We evaluate the performance of our local OpenCV pipeline based on:
1. **Document Detection Rate:** Percentage of test images where the 4-point contour correctly isolates the page.
2. **Bandwidth Reduction:** By cropping and thresholding locally, we reduce the average payload size by ~65%, which is critical for the target demographic in low-bandwidth areas.

## Agent Success Rate
We track the agent's decision accuracy:
- **True Positives (Rejections):** Correctly rejecting blurred or poorly lit images (verified against human baseline).
- **Extraction Confidence:** Monitoring the confidence scores returned by the AWS AI extraction pipeline.
