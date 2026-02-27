import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Topic } from "aws-cdk-lib/aws-sns";
import { DockerImageName, ECRDeployment } from "cdk-ecr-deployment";
import { Construct } from "constructs";
import {
  ImageScannerWithTrivyV2,
  ScanLogsOutput,
  Scanners,
  Severity,
  TargetImagePlatform,
} from "image-scanner-with-trivy";
import { resolve } from "path";

interface CdkImageScanTestStackProps extends StackProps {
  ecrTag: string;
}

export class CdkImageScanTestStack extends Stack {
  constructor(scope: Construct, id: string, props: CdkImageScanTestStackProps) {
    super(scope, id, props);

    const repository = new Repository(this, "ImageRepository", {
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      imageScanOnPush: true,
    });

    const image = new DockerImageAsset(this, "DockerImage", {
      directory: resolve(__dirname, "../"),
    });

    const ecrDeployment = new ECRDeployment(this, "DeployImage", {
      src: new DockerImageName(image.imageUri),
      dest: new DockerImageName(`${repository.repositoryUri}:${props.ecrTag}`),
    });

    const logBucket = new Bucket(this, "ScanLogsBucket", {
      // removalPolicy: RemovalPolicy.DESTROY,
      // autoDeleteObjects: true,
    });

    const topic = Topic.fromTopicArn(
      this,
      "VulnsNotificationTopic",
      Stack.of(this).formatArn({
        service: "sns",
        region: "us-east-1",
        account: Stack.of(this).account,
        resource: "main-CostCheck-BillingAlarmTopic",
      }),
    );

    new ImageScannerWithTrivyV2(this, "ImageScannerWithTrivy", {
      imageUri: image.imageUri,
      repository: image.repository,
      ignoreUnfixed: true,
      severity: [Severity.CRITICAL],
      scanners: [Scanners.VULN, Scanners.SECRET],
      targetImagePlatform: TargetImagePlatform.LINUX_ARM64,
      vulnsNotificationTopic: topic,
      blockConstructs: [ecrDeployment],
      scanLogsOutput: ScanLogsOutput.s3({
        bucket: logBucket,
        prefix: "trivy-scan-logs",
      }),
    });
  }
}
