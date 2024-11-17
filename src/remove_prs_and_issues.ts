import type { GitHub } from "@actions/github/lib/utils";
import type { Organization } from "@octokit/graphql-schema";

export function generateGetProjectV2ItemsQuery(
  login: string,
  number: string,
  first: number,
  after?: string,
): string {
  const itemParams = [`first: ${first}`];

  if (after !== undefined) {
    itemParams.push(`after: "${after}"`);
  }

  return `
        {
          organization(login: "${login}") {
            projectV2(number: ${number}) {
              id
              items(${itemParams.join(", ")}) {
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
}

export function generateDeleteItemFromProjectQuery(
  projectID: string,
  itemID: string,
): string {
  return `
        mutation {
          deleteProjectV2Item(
            input: {projectId: "${projectID}", itemId: "${itemID}"}
          ) {
            deletedItemId
          }
        }
        `;
}

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

    const getProjectV2ItemsQuery = generateGetProjectV2ItemsQuery(
      projectData[1],
      projectData[2],
      itemNum,
      itemCursor,
    );
    console.log(getProjectV2ItemsQuery);
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
      const deleteItemFromProjectQuery = generateDeleteItemFromProjectQuery(
        projectV2.id,
        item.id,
      );
      console.log(deleteItemFromProjectQuery);
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
