/* Shared slug helper: lowercase, non-alphanumerics collapsed to a dash. */
export const slugify = (name) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
