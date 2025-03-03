import { type PluginUtils } from 'tailwindcss/types/config'

export default function typographyStyles({ theme }: PluginUtils) {
  return {
    DEFAULT: {
      css: {
        '--tw-prose-body': theme('colors.zinc.400'),
        '--tw-prose-headings': theme('colors.white'),
        '--tw-prose-links': theme('colors.teal.500'),
        '--tw-prose-links-hover': theme('colors.teal.400'),
        '--tw-prose-underline': theme('colors.teal.500 / 0.2'),
        '--tw-prose-underline-hover': theme('colors.teal.500'),
        '--tw-prose-bold': theme('colors.zinc.200'),
        '--tw-prose-counters': theme('colors.zinc.200'),
        '--tw-prose-bullets': theme('colors.zinc.200'),
        '--tw-prose-hr': theme('colors.zinc.700 / 0.4'),
        '--tw-prose-quote-borders': theme('colors.zinc.500'),
        '--tw-prose-captions': theme('colors.zinc.500'),
        '--tw-prose-code': theme('colors.zinc.300'),
        '--tw-prose-code-bg': theme('colors.zinc.800 / 0.5'),
        '--tw-prose-pre-code': theme('colors.zinc.100'),
        '--tw-prose-pre-bg': theme('colors.zinc.900'),
        '--tw-prose-pre-border': 'transparent',
        '--tw-prose-th-borders': theme('colors.zinc.700'),
        '--tw-prose-td-borders': theme('colors.zinc.800'),

        // Base
        color: 'var(--tw-prose-body)',
        fontSize: theme('fontSize.sm')[0],
        lineHeight: theme('lineHeight.7'),

        // Text
        'p': {
          marginTop: theme('spacing.6'),
          marginBottom: theme('spacing.6'),
        },
        'p.lead': {
          fontSize: theme('fontSize.base')[0],
          fontWeight: theme('fontWeight.normal'),
          marginTop: theme('spacing.6'),
          marginBottom: theme('spacing.6'),
        },

        // Lists
        'ul': {
          marginTop: theme('spacing.6'),
          marginBottom: theme('spacing.6'),
          paddingLeft: theme('spacing.6'),
        },
        'ol': {
          marginTop: theme('spacing.6'),
          marginBottom: theme('spacing.6'),
          paddingLeft: theme('spacing.6'),
        },
        'li': {
          marginTop: theme('spacing.2'),
          marginBottom: theme('spacing.2'),
        },

        // Headings
        'h1, h2, h3': {
          color: 'var(--tw-prose-headings)',
          fontWeight: theme('fontWeight.semibold'),
        },
        'h1': {
          fontSize: theme('fontSize.2xl')[0],
          lineHeight: theme('lineHeight.8'),
          marginBottom: theme('spacing.4'),
        },
        'h2': {
          fontSize: theme('fontSize.lg')[0],
          lineHeight: theme('lineHeight.7'),
          marginTop: theme('spacing.16'),
          marginBottom: theme('spacing.4'),
        },
        'h3': {
          fontSize: theme('fontSize.base')[0],
          lineHeight: theme('lineHeight.7'),
          marginTop: theme('spacing.12'),
          marginBottom: theme('spacing.4'),
        },

        // Links
        'a': {
          color: 'var(--tw-prose-links)',
          fontWeight: theme('fontWeight.semibold'),
          textDecoration: 'underline',
          textDecorationColor: 'var(--tw-prose-underline)',
          transitionProperty: 'color, text-decoration-color',
          transitionDuration: theme('transitionDuration.150'),
          transitionTimingFunction: theme('transitionTimingFunction.in-out'),
        },
        'a:hover': {
          color: 'var(--tw-prose-links-hover)',
          textDecorationColor: 'var(--tw-prose-underline-hover)',
        },

        // Quotes
        'blockquote': {
          paddingLeft: theme('spacing.6'),
          borderLeftWidth: theme('borderWidth.2'),
          borderLeftColor: 'var(--tw-prose-quote-borders)',
          fontStyle: 'italic',
        },

        // Code blocks
        'code': {
          color: 'var(--tw-prose-code)',
          borderRadius: theme('borderRadius.lg'),
          paddingTop: theme('padding.1'),
          paddingRight: theme('padding.2'),
          paddingBottom: theme('padding.1'),
          paddingLeft: theme('padding.2'),
          boxShadow: 'inset 0 0 0 1px var(--tw-prose-code-bg)',
          backgroundColor: 'var(--tw-prose-code-bg)',
          fontSize: theme('fontSize.2xs'),
        },
        'a code': {
          color: 'inherit',
        },
        ':not(pre) > code::before': {
          content: '""',
        },
        ':not(pre) > code::after': {
          content: '""',
        },
        'pre': {
          color: 'var(--tw-prose-pre-code)',
          fontSize: theme('fontSize.2xs'),
          fontWeight: theme('fontWeight.normal'),
          backgroundColor: 'var(--tw-prose-pre-bg)',
          borderRadius: theme('borderRadius.lg'),
          padding: theme('spacing.4'),
          overflowX: 'auto',
          border: '1px solid',
          borderColor: 'var(--tw-prose-pre-border)',
        },
        'pre code': {
          display: 'inline',
          color: 'inherit',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          backgroundColor: 'transparent',
          borderRadius: 0,
          padding: 0,
        },

        // Horizontal rules
        'hr': {
          marginTop: theme('spacing.20'),
          marginBottom: theme('spacing.20'),
          borderTopWidth: '1px',
          borderColor: 'var(--tw-prose-hr)',
          '@screen lg': {
            marginLeft: `calc(${theme('spacing.12')} * -1)`,
            marginRight: `calc(${theme('spacing.12')} * -1)`,
          },
        },

        // Tables
        'table': {
          width: '100%',
          tableLayout: 'auto',
          textAlign: 'left',
          fontSize: theme('fontSize.sm')[0],
        },
        'thead': {
          borderBottomWidth: '1px',
          borderBottomColor: 'var(--tw-prose-th-borders)',
        },
        'thead th': {
          color: 'var(--tw-prose-headings)',
          fontWeight: theme('fontWeight.semibold'),
          verticalAlign: 'bottom',
          paddingBottom: theme('spacing.2'),
        },
        'thead th:not(:first-child)': {
          paddingLeft: theme('spacing.2'),
        },
        'thead th:not(:last-child)': {
          paddingRight: theme('spacing.2'),
        },
        'tbody tr': {
          borderBottomWidth: '1px',
          borderBottomColor: 'var(--tw-prose-td-borders)',
        },
        'tbody tr:last-child': {
          borderBottomWidth: 0,
        },
        'tbody td': {
          verticalAlign: 'baseline',
        },
        'tfoot': {
          borderTopWidth: '1px',
          borderTopColor: 'var(--tw-prose-th-borders)',
        },
        'tfoot td': {
          verticalAlign: 'top',
        },
        ':is(tbody, tfoot) td': {
          paddingTop: theme('spacing.2'),
          paddingBottom: theme('spacing.2'),
        },
        ':is(tbody, tfoot) td:not(:first-child)': {
          paddingLeft: theme('spacing.2'),
        },
        ':is(tbody, tfoot) td:not(:last-child)': {
          paddingRight: theme('spacing.2'),
        },
      },
    },
  }
} 