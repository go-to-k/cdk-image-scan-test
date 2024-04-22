import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Repository } from "aws-cdk-lib/aws-ecr";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { DockerImageName, ECRDeployment } from "cdk-ecr-deployment";
import { Construct } from "constructs";
import { ImageScannerWithDockle } from "image-scanner-with-dockle";
import { ImageScannerWithTrivy, Scanners, Severity } from "image-scanner-with-trivy";
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

    const imageScannerWithTrivy = new ImageScannerWithTrivy(this, "ImageScannerWithTrivy", {
      imageUri: image.imageUri,
      repository: image.repository,
      ignoreUnfixed: true,
      severity: [Severity.CRITICAL],
      scanners: [Scanners.VULN, Scanners.SECRET],
      exitCode: 1,
      exitOnEol: 1,
      trivyIgnore: ["CVE-2023-37920", "CVE-2019-14697 exp:2023-01-01", "generic-unwanted-rule"],
      // memorySize: 4096,
      platform: "linux/arm64",
    });

    const imageScannerWithDockle = new ImageScannerWithDockle(this, "ImageScannerWithDockle", {
      imageUri: image.imageUri,
      repository: image.repository,
      ignore: ["CIS-DI-0009"], // See https://github.com/goodwithtech/dockle#checkpoint-summary
    });

    const ecrDeployment = new ECRDeployment(this, "DeployImage", {
      src: new DockerImageName(image.imageUri),
      dest: new DockerImageName(`${repository.repositoryUri}:${props.ecrTag}`),
    });
    ecrDeployment.node.addDependency(imageScannerWithTrivy);
    ecrDeployment.node.addDependency(imageScannerWithDockle);
  }
}
