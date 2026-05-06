# SES Inbound Email Forwarder (Lambda)

Forwards inbound email from AWS SES to the operator-ui's
`/api/inbound/email` endpoint, where it's logged as a `Touch` on the
intake addressed in the `to` field (`intake-<uuid>@<your-reply-domain>`).

## Deploy

### Option 1 — Manual (AWS Console)

1. **Build the deployment zip**
   ```sh
   cd infrastructure/lambda/inbound-email
   npm install
   npm run package
   # produces inbound-email.zip
   ```

2. **Create the Lambda**
   - Console → Lambda → Create function → Author from scratch
   - Name: `ifd-inbound-email-forwarder`
   - Runtime: Node.js 20.x
   - Architecture: arm64 (cheaper) or x86_64
   - Upload `inbound-email.zip`
   - Handler: `index.handler` (the default)
   - Timeout: 30 seconds
   - Memory: 256 MB

3. **Set environment variables on the Lambda**
   - `APP_BASE_URL` = `https://ironfrontdigital.com`
   - `INBOUND_EMAIL_SECRET` = same value as the operator-ui env var

4. **Grant IAM permissions** (attach an inline policy)
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-ses-inbound-bucket/*"
       }
     ]
   }
   ```
   The default `AWSLambdaBasicExecutionRole` covers CloudWatch logs.

### Option 2 — AWS SAM / Terraform

The handler is plain Node.js with two env vars and one IAM permission;
adapt to whatever IaC you use. Sketch (SAM):

```yaml
Resources:
  InboundEmailForwarder:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: infrastructure/lambda/inbound-email/
      Handler: index.handler
      Runtime: nodejs20.x
      Timeout: 30
      MemorySize: 256
      Environment:
        Variables:
          APP_BASE_URL: !Ref AppBaseUrl
          INBOUND_EMAIL_SECRET: !Ref InboundEmailSecret
      Policies:
        - S3ReadPolicy:
            BucketName: !Ref SesInboundBucket
```

## Wire SES inbound to call this Lambda

1. **Create an S3 bucket** for SES to write incoming messages to (or
   reuse an existing one).

2. **Add an MX record** on your reply-to domain (e.g.
   `operations.ironfrontdigital.com`) pointing at AWS SES inbound:
   ```
   operations.ironfrontdigital.com.  IN  MX  10  inbound-smtp.us-east-1.amazonaws.com.
   ```
   (use whatever region matches your SES setup)

3. **Verify the MX domain in SES** (Console → SES → Verified identities → Create identity → Domain).

4. **Create a Receipt Rule Set** (Console → SES → Email receiving):
   - Recipient: `operations.ironfrontdigital.com` (or specifically `intake-*@...`)
   - Action 1: **S3** — write to the bucket above
   - Action 2: **Lambda** — invoke `ifd-inbound-email-forwarder` (event mode, not RequestResponse)
   - Set as active rule set

5. **Test:** send an email to `intake-<some-real-uuid>@operations.ironfrontdigital.com`. The flow:
   ```
   sender's MTA -> AWS SES inbound -> S3 (raw .eml) + Lambda invocation
                                             |
                                             v
                       Lambda fetches raw, parses, POSTs to /api/inbound/email
                                             |
                                             v
                       operator-ui logs the Touch and bumps the Intake
   ```

## Observability

- Lambda CloudWatch logs (`/aws/lambda/ifd-inbound-email-forwarder`)
- The operator-ui writes `inbound_email_received` events on success,
  `inbound_email_unrouted` events when the to-address doesn't match an
  intake.
- A 401 response from `/api/inbound/email` means the Lambda's
  `INBOUND_EMAIL_SECRET` doesn't match the operator-ui's. Rotate both
  values together.

## Notes

- The Lambda accepts both direct SES invocation and SNS-wrapped SES
  events, so it works whether you route SES → Lambda directly or SES → SNS → Lambda.
- It posts one request per matching recipient (rare CC scenario), so an
  email CC'd to two intake addresses creates two `Touch` rows.
- `mailparser` handles MIME parts, attachments (ignored), and encoded
  bodies — this isn't a regex hack.
