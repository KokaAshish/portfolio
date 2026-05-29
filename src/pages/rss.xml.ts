import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());

  return rss({
    title:       'Ashish Koka — Blog',
    description: 'Writing about software, process, and the things I\'ve learned building things.',
    site:        context.site!,
    items: posts.map((post) => ({
      title:       post.data.title,
      description: post.data.excerpt,
      pubDate:     post.data.date,
      link:        `/blog/${post.slug}/`,
      categories:  post.data.tags,
    })),
    customData: '<language>en-us</language>',
  });
};
