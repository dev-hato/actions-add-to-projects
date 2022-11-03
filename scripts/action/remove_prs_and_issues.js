module.exports = async ({ github }) => {
  const projectData = process.env.PROJECT_URL.match(/https:\/\/github.com\/orgs\/([^/]+)\/projects\/([^/]+)/)
  let itemCursor

  for (let i = 0; i < 3; i++) {
    let itemNum

    if (i === 0) {
      itemNum = 50
    } else {
      itemNum = 10
    }

    let afterQuery = ''

    if (itemCursor !== undefined) {
      afterQuery = `, after: "${itemCursor}"`
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
        `
    console.log(getProjectV2ItemsQuery)
    const projectV2Items = await github.graphql(getProjectV2ItemsQuery)
    const projectV2 = projectV2Items.organization.projectV2
    const items = projectV2.items

    if (items.totalCount < 1200) {
      return
    }

    const closedItems = items.nodes.filter(v => v.content.closed)

    if (closedItems.length === 0) {
      const pageInfo = items.pageInfo
      if (pageInfo.hasNextPage) {
        itemCursor = pageInfo.endCursor
        continue
      } else {
        return
      }
    }

    const item = closedItems[0]
    const deleteItemFromProjectQuery = `
        mutation {
          deleteProjectV2Item(
            input: {projectId: "${projectV2.id}", itemId: "${item.id}"}
          ) {
            deletedItemId
          }
        }
        `
    console.log(item.content.url)
    console.log(deleteItemFromProjectQuery)
    console.log(await github.graphql(deleteItemFromProjectQuery))
    return
  }
}
