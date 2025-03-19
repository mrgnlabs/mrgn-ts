const { createClient } = require('@sanity/client')

// Initialize the Sanity client
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2023-03-25',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

const homePageContent = {
  _type: 'docPage',
  title: 'marginfi documentation',
  description: "Learn everything there is to know about the marginfi protocol and how to integrate marginfi's liquidity layer into your product.",
  slug: {
    _type: 'slug',
    current: 'home'
  },
  content: [
    {
      _type: 'block',
      style: 'h1',
      children: [{ _type: 'span', text: 'Welcome to marginfi' }]
    },
    {
      _type: 'block',
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          text: "marginfi is a fully-decentralized borrowing and lending protocol built on Solana. With marginfi, you can access native yield, embedded risk systems, and off-chain data plug-ins all in one place. Use marginfi to access the margin you need, when you need it.",
          marks: ['lead']
        }
      ]
    },
    {
      _type: 'buttonGroup',
      buttons: [
        {
          _type: 'button',
          text: 'Get Started',
          href: '/v2/introduction',
          variant: 'primary',
          arrow: 'right'
        },
        {
          _type: 'button',
          text: 'Explore SDKs',
          href: '/v2/sdks',
          variant: 'outline'
        }
      ]
    },
    {
      _type: 'block',
      style: 'h2',
      children: [{ _type: 'span', text: 'Features' }]
    },
    {
      _type: 'featureList',
      features: [
        {
          title: 'End-to-End Risk Engine',
          description: "Constantly monitors the health of each individual bank, covering the entire protocol's risk comprehensively."
        },
        {
          title: 'In-House Liquidators',
          description: "While marginfi has in-house liquidators, the protocol also encourages and includes a significant number of external liquidators to ensure a robust and efficient liquidation process."
        },
        {
          title: 'Market Depth and Recovery Modeling',
          description: "Gathers data to model market depth and recovery time, enabling predictions of future liquidity in various market scenarios."
        },
        {
          title: 'Dynamic Risk System',
          description: "Plans to implement live bank updates directly from risk models for a dynamic and real-time risk management system."
        },
        {
          title: 'Global Borrowing and Lending',
          description: "The protocol enables borrowing and lending of margin under a unified global context, streamlining the process for traders."
        },
        {
          title: 'Leverage Trading',
          description: "marginfi supports trading with leverage, empowering traders to maximize their market participation."
        },
        {
          title: 'Comprehensive Market Access',
          description: "Traders can optimize their financial exposure across over 100 DeFi projects on Solana, including spot, futures, and options markets."
        }
      ]
    },
    {
      _type: 'buttonGroup',
      buttons: [
        {
          _type: 'button',
          text: 'Start using our SDK',
          href: '/v2/sdks',
          variant: 'text',
          arrow: 'right'
        }
      ]
    },
    {
      _type: 'guides'
    },
    {
      _type: 'resources'
    }
  ]
}

async function createHomePage() {
  try {
    // Check if home page already exists
    const existingDoc = await client.fetch('*[_type == "docPage" && slug.current == "home"][0]')
    
    if (existingDoc) {
      console.log('Updating existing home page...')
      await client
        .patch(existingDoc._id)
        .set(homePageContent)
        .commit()
      console.log('Home page updated successfully!')
    } else {
      console.log('Creating new home page...')
      await client.create(homePageContent)
      console.log('Home page created successfully!')
    }
  } catch (error) {
    console.error('Error creating/updating home page:', error)
  }
}

// Load environment variables
require('dotenv').config({ path: './apps/marginfi-v2-docs/.env' })

createHomePage() 