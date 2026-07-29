import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { sections, site } from '../content/site'
import './Layout.css'

type Props = {
  children: ReactNode
}

export function Layout({ children }: Props) {
  return (
    <div className="layout">
      <div className="atmosphere" aria-hidden="true" />
      <header className="site-header">
        <NavLink to="/" className="site-logo">
          {site.brand}
        </NavLink>
        <nav className="site-nav" aria-label="Main">
          {sections
            .filter((s) => s.path !== '/')
            .map((section) => (
              <NavLink
                key={section.id}
                to={section.path}
                className={({ isActive }) =>
                  isActive ? 'nav-link is-active' : 'nav-link'
                }
              >
                {section.label}
              </NavLink>
            ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
