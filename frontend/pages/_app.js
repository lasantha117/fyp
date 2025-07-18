// frontend/pages/_app.js
// This file is a custom App component in Next.js.
// It wraps all your pages and is useful for global CSS, layout, etc.

import 'bootstrap/dist/css/bootstrap.min.css';
// You might also want to import your global Tailwind CSS here if you have one
// For example: import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  // Component refers to the active page, and pageProps is an object
  // with the initial props that were preloaded for your page by Next.js.
  return <Component {...pageProps} />;
}

export default MyApp;
