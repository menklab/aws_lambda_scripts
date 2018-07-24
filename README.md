# AWS Administrator Functions
This is a collection of functions that are installed at the creation of a new AWS Orginization. They help to provide automated administrative tasks that would otherwise be monotonous to do as a human.

## Install
`npm install`

## Deploy
`./sls.sh admin deploy --aws-profile <PROFILE> --account-id <####>`


## How It Works
##### Backup EC2 Volumes
Snapshot volume.And rotate old snapshots. The tags must be applied to the volume. But if you add it to the ec2 instance using the tag copy function below it will end up on the volume as well.

- tag name: `snapshot_rotation`
- tag value: `int for days to keep`

##### Tag EC2 Volumes
This applies any tag found on the ec2 instance to the corresponding and attached volumes

##### Update CNAME On Boot
This will update a cname record in route53 with the new ipadress of the ec2 instance at boot
- tag name: `cname`
- tag value `sub.domain.com`
- tag name: `zoneId`
- tag value `<ZONE ID>`


##### Cloudwatch Alarm For EC2
Create a subscription for Email and SMS alerts. It will also register a cloudwatch function to monitor the state of an ec2 instance.
`./sls.sh cloudwatch deploy --instance-id <INSTANCE ID> --sns-number <15555555555> --sns-email "<EMAIL ADDRESS>" --account-id <ACCOUNT ID>`


##### Static Website With Cloudfront Distribution
Create a new S3 bucket, Cloudfront distribution, and route53 routes
`./sls.sh static-website deploy --bucket-name <BUCKET NAME> --hosted-zone-id <HOSTED ZONE> --aws-profile <AWS PROFILE> --verification-domain example.com`

### Helpful Tools
- cwtail - used to tail lambda functions  
`npm install -g cwtail`  
`cwtail -l`   
`cwtail -f /aws/lambda/MyFunction`

