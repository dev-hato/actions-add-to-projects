// src/remove_prs_and_issues.ts
async function script(github) {
  const projectURL = process.env.PROJECT_URL;
  if (projectURL === void 0) {
    throw new Error("PROJECT_URL must set.");
  }
  const projectData = projectURL.match(
    /https:\/\/github.com\/orgs\/([^/]+)\/projects\/([^/]+)/
  );
  if (projectData === null || projectData.length < 3) {
    throw new Error("PROJECT_URL format is invalid.");
  }
  let itemCursor = void 0;
  for (let i = 0; i < 3; i++) {
    let itemNum = 10;
    if (i === 0) {
      itemNum = 50;
    }
    let afterQuery = "";
    if (itemCursor !== void 0) {
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
    const {
      organization: { projectV2 }
    } = await github.graphql(
      getProjectV2ItemsQuery
    );
    if (projectV2 === void 0 || projectV2 === null) {
      throw new Error("projectV2 must set.");
    }
    const {
      totalCount,
      pageInfo: { hasNextPage, endCursor },
      nodes
    } = projectV2.items;
    if (totalCount < 1200 || nodes === void 0 || nodes === null) {
      return;
    }
    for (const item of nodes) {
      if (item === null) {
        throw new Error("item must set.");
      }
      const content = item.content;
      if (content === void 0 || content === null) {
        throw new Error("content must set.");
      }
      if (content.__typename !== "Issue" && content.__typename !== "PullRequest") {
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
      console.log(await github.graphql(deleteItemFromProjectQuery));
      return;
    }
    if (!hasNextPage) {
      return;
    }
    if (endCursor === void 0 || endCursor === null) {
      throw new Error("endCursor must set.");
    }
    itemCursor = endCursor;
  }
}
export {
  script
};
