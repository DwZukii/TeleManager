import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/dm-sans'
import './index.css'
import { applyTextSize } from './hooks/useTextSize'

// Before the first paint, so the page does not jump to the chosen size.
applyTextSize()

// `/?ui` opens the component review page. Dev builds only, and it never loads
// App, so it works without Supabase credentials.
const showReview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('ui')

// The entry file is never hot-swapped, so fast refresh has nothing to do here.
// eslint-disable-next-line react-refresh/only-export-components
const Root = showReview ? lazy(() => import('./ui/gallery/Gallery.jsx')) : lazy(() => import('./App.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={null}>
      <Root />
    </Suspense>
  </StrictMode>,
)
