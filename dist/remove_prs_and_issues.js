"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/remove_prs_and_issues.ts
var remove_prs_and_issues_exports = {};
__export(remove_prs_and_issues_exports, {
  script: () => script
});
module.exports = __toCommonJS(remove_prs_and_issues_exports);
function isString(s) {
  return s !== void 0;
}
async function script(github) {
  const projectURL = process.env.PROJECT_URL;
  if (!isString(projectURL)) {
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
    if (!isString(itemCursor)) {
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
    if (nodes === void 0 || nodes === null || totalCount < 1200) {
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
      const deleteItemFromProjectQuery = `
        mutation {
          deleteProjectV2Item(
            input: {projectId: "${projectV2.id}", itemId: "${item.id}"}
          ) {
            deletedItemId
          }
        }
        `;
      console.log(content.url);
      console.log(deleteItemFromProjectQuery);
      console.log(await github.graphql(deleteItemFromProjectQuery));
      return;
    }
    if (!hasNextPage) {
      return;
    }
    if (endCursor === null || !isString(endCursor)) {
      throw new Error("endCursor must set.");
    }
    itemCursor = endCursor;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  script
});
