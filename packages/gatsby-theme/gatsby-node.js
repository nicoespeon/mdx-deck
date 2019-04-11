const path = require('path')
const { createFilePath } = require('gatsby-source-filesystem')
const Debug = require('debug')
const mkdirp = require('mkdirp')
const pkg = require('./package.json')

const debug = Debug('@mdx-deck/gatsby-theme')

exports.onPreBootstrap = ({ store }) => {
  const { program } = store.getState()

  const dir = path.join(program.directory, `src/decks`)

  debug(`Initializing ${dir} directory`)
  mkdirp.sync(dir)
}

exports.onCreateNode = ({ node, actions, getNode }, opts = {}) => {
  const { name = 'decks' } = opts
  if (node.internal.type !== 'Mdx') return

  const value = path.join('/', name, createFilePath({ node, getNode }))
  actions.createNodeField({
    name: 'deck',
    node,
    value,
    plugin: pkg.name,
  })
}

const stripSlash = str => str.replace(/\/$/, '')

exports.createPages = async ({ graphql, actions }, opts = {}) => {
  const { name = 'decks' } = opts

  const result = await graphql(`
    {
      allMdx {
        edges {
          node {
            id
            fields {
              deck
            }
            parent {
              ... on File {
                name
                sourceInstanceName
              }
            }
          }
        }
      }
    }
  `)
  if (result.errors) {
    debug(result.errors)
    return
  }

  const decks = result.data.allMdx.edges
    .filter(edge => {
      return edge.node.parent.sourceInstanceName === 'decks'
    })
    .map(edge => edge.node)

  // index page
  actions.createPage({
    path: path.join('/', name),
    component: require.resolve('./src/templates/index.js'),
  })

  decks.forEach(deck => {
    const matchPath = path.join(deck.fields.deck, '*')
    actions.createPage({
      path: deck.fields.deck,
      matchPath: path.join(deck.fields.deck, '*'),
      component: require.resolve('./src/templates/deck.js'),
      context: {
        id: deck.id,
        basepath: stripSlash(deck.fields.deck),
      },
    })
  })
}