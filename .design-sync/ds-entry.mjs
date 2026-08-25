// The bundle entry the design-system sync compiles into its component namespace.
//
// IT IS EMPTY, AND THAT IS THE ACCURATE ANSWER RATHER THAN A PLACEHOLDER. The sync's
// component path wants a package whose built output exposes components at runtime; this
// site's UI is Astro components, which compile to a server render and have no runtime
// form a design tool could mount — the project rule that there is no client-side UI
// framework is what makes that permanent rather than a gap to close. So what ships is the
// styling layer: the theme tokens and the compiled stylesheet, and no components at all.
//
// The converter needs this file for a second reason worth recording: without an explicit
// entry it looks for the package inside node_modules, where a repository never installs
// itself, and then reads the version as 0.0.0 and finds no source. Pointing at a file in
// the tree is what makes it resolve the real package.json.
export {};
