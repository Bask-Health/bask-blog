import type { GetServerSideProps } from 'next'
import { host } from '@/lib/config'
import { getSiteMap } from '@/lib/get-site-map'
import type { SiteMap } from '@/lib/types'

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  if (req.method !== 'GET') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json')
    res.write(JSON.stringify({ error: 'method not allowed' }))
    res.end()
    return {
      props: {}
    }
  }

  const siteMap = await getSiteMap()

  // cache for up to 8 hours
  res.setHeader(
    'Cache-Control',
    'public, max-age=28800, stale-while-revalidate=28800'
  )
  res.setHeader('Content-Type', 'text/xml')
  res.write(createSitemap(siteMap))
  res.end()

  return {
    props: {}
  }
}

const createSitemap = (siteMap: SiteMap) => {
  const currentDate = new Date().toISOString()

  return `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>${host}/blog</loc>
      <changefreq>daily</changefreq>
    </url>

    <url>
      <loc>${host}/blog/</loc>
    </url>

    ${Object.keys(siteMap.canonicalPageMap)
      .map((canonicalPagePath) => {
        const lastMod = siteMap.pageModDates[canonicalPagePath] || currentDate
        return `
          <url>
            <loc>${host}/blog/${canonicalPagePath}</loc>
            <lastmod>${lastMod}</lastmod>
          </url>
        `.trim()
      })
      .join('')}
  </urlset>`
}

export default function Sitemap() {
  return null
}
