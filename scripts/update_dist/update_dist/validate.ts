import { validate } from "@octokit/graphql-schema";
import {
  generateDeleteItemFromProjectQuery,
  generateGetProjectV2ItemsQuery,
} from "../../../src/remove_prs_and_issues";

export async function script(){
  const getProjectV2ItemsQueryErrors = validate(
      generateGetProjectV2ItemsQuery("dev-hato", "1", 50, "hoge"),
  );

  if (0 < getProjectV2ItemsQueryErrors.length) {
    throw getProjectV2ItemsQueryErrors[0];
  }

  const deleteItemFromProjectQueryErrors = validate(
      generateDeleteItemFromProjectQuery("fuga", "piyo"),
  );

  if (0 < deleteItemFromProjectQueryErrors.length) {
    throw deleteItemFromProjectQueryErrors[0];
  }
}
