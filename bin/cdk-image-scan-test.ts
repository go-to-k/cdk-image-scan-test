#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkImageScanTestStack } from "../lib/cdk-image-scan-test-stack";

const app = new cdk.App();
new CdkImageScanTestStack(app, "CdkImageScanTestStack", {
  ecrTag: "latest",
});
