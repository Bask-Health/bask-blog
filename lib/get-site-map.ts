import { getAllPagesInSpace, uuidToId } from 'notion-utils'
import pMemoize from 'p-memoize'

import * as config from './config'
import * as types from './types'
import { includeNotionIdInUrls } from './config'
import { getCanonicalPageId } from './get-canonical-page-id'
import { notion } from './notion-api'

const uuid = !!includeNotionIdInUrls

export async function getSiteMap(): Promise<types.SiteMap> {
  const partialSiteMap = await getAllPages(
    config.rootNotionPageId,
    config.rootNotionSpaceId
  )

  return {
    site: config.site,
    ...partialSiteMap
  } as types.SiteMap
}

const getAllPages = pMemoize(getAllPagesImpl, {
  cacheKey: (...args) => JSON.stringify(args)
})

async function getAllPagesImpl(
  rootNotionPageId: string,
  rootNotionSpaceId: string
): Promise<Partial<types.SiteMap>> {
  const getPage = async (pageId: string, ...args) => {
    console.log('\nnotion getPage', uuidToId(pageId))
    return notion.getPage(pageId, ...args)
  }

  const pageMap = await getAllPagesInSpace(
    rootNotionPageId,
    rootNotionSpaceId,
    getPage
  )

  const canonicalPageMap = {}
  const pageModDates = {}

  Object.keys(pageMap).forEach((pageId: string) => {
    const recordMap = pageMap[pageId]
    if (!recordMap) {
      throw new Error(`Error loading page "${pageId}"`)
    }

    const canonicalPageId = getCanonicalPageId(pageId, recordMap, {
      uuid
    })

    if (canonicalPageMap[canonicalPageId]) {
      console.warn('error duplicate canonical page id', {
        canonicalPageId,
        pageId,
        existingPageId: canonicalPageMap[canonicalPageId]
      })
    } else {
      canonicalPageMap[canonicalPageId] = pageId
      
      // Extract the last modified date from the recordMap
      const lastEditedTime = recordMap.block[pageId]?.value?.last_edited_time
      if (lastEditedTime) {
        pageModDates[canonicalPageId] = new Date(lastEditedTime).toISOString()
      }
    }
  })

  return {
    pageMap,
    canonicalPageMap,
    pageModDates
  }
}