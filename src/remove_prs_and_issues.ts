import type { GitHub } from "@actions/github/lib/utils";
import type { Organization } from "@octokit/graphql-schema";
import { validate } from "@octokit/graphql-schema";

export async function script(github: InstanceType<typeof GitHub>) {
  const projectURL = process.env.PROJECT_URL;

  if (projectURL === undefined) {
    throw new Error("PROJECT_URL must set.");
  }

  const projectData = projectURL.match(
    /https:\/\/github.com\/orgs\/([^/]+)\/projects\/([^/]+)/,
  );

  if (projectData === null || projectData.length < 3) {
    throw new Error("PROJECT_URL format is invalid.");
  }

  let itemCursor: string | undefined = undefined;

  for (let i = 0; i < 3; i++) {
    let itemNum = 10;

    if (i === 0) {
      itemNum = 50;
    }

    let afterQuery = "";

    if (itemCursor !== undefined) {
      afterQuery = `, after: "${itemCursor}"`;
    }

    const getProjectV2ItemsQuery = `
        {
          organization(login: "${projectData[1]}") {
            projectV2(number: ${projectData[2]}) {
              id
              items(first: ${itemNum}${afterQuery}) {
                totalCount
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  content {
                    ... on PullRequest {
                      url
                      closed
                    }
                    ... on Issue {
                      url
                      closed
                    }
                  }
                }
              }
            }
          }
        }
        `;
    console.log(getProjectV2ItemsQuery);
    const getProjectV2ItemsQueryErrors = validate(getProjectV2ItemsQuery);

    if (0 < getProjectV2ItemsQueryErrors.length) {
      throw getProjectV2ItemsQueryErrors[0];
    }

    const {
      organization: { projectV2 },
    } = await github.graphql<{ organization: Organization }>(
      getProjectV2ItemsQuery,
    );

    if (projectV2 === undefined || projectV2 === null) {
      throw new Error("projectV2 must set.");
    }

    const {
      totalCount,
      pageInfo: { hasNextPage, endCursor },
      nodes,
    } = projectV2.items;

    if (totalCount < 1200 || nodes === undefined || nodes === null) {
      return;
    }

    for (const item of nodes) {
      if (item === null) {
        throw new Error("item must set.");
      }

      const content = item.content;

      if (content === undefined || content === null) {
        throw new Error("content must set.");
      }

      if (
        content.__typename !== "Issue" &&
        content.__typename !== "PullRequest"
      ) {
        throw new Error(`content is invalid type ${content.__typename}.`);
      }

      if (!content.closed) {
        continue;
      }

      console.log(content.url);
      const deleteItemFromProjectQuery = `
        mutation {
          deleteProjectV2Item(
            input: {projectId: "${projectV2.id}", itemId: "${item.id}"}
          ) {
            deletedItemId
          }
        }
        `;
      console.log(deleteItemFromProjectQuery);
      const deleteItemFromProjectQueryErrors = validate(
        deleteItemFromProjectQuery,
      );

      if (0 < deleteItemFromProjectQueryErrors.length) {
        throw deleteItemFromProjectQueryErrors[0];
      }

      console.log(await github.graphql(deleteItemFromProjectQuery));
      return;
    }

    if (!hasNextPage) {
      return;
    }

    if (endCursor === undefined || endCursor === null) {
      throw new Error("endCursor must set.");
    }

    itemCursor = endCursor;
  }
}
