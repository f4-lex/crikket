# @crikket/bug-reports

## 0.0.1

### Patch Changes

- 4c83931: Fix debugger ingestion failing with "incorrect header check" on S3 backends
  (Garage, MinIO) that transparently decompress `Content-Encoding: gzip` on read.
  Gate `gunzipSync` on the actual gzip magic bytes instead of the recorded
  encoding. Also stop 500ing the whole submission when the optional debugger
  payload fails — the report is already persisted, so return its
  `submissionStatus` instead.
