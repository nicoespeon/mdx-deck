import React from 'react'
import PropTypes from 'prop-types'
import { Router, globalHistory, navigate } from '@reach/router'
import { Swipeable } from 'react-swipeable'
import querystring from 'querystring'
import Provider from './Provider'
import Slide from './Slide'
import Presenter from './Presenter'
import Overview from './Overview'
import Grid from './Grid'
import Print from './Print'
import GoogleFonts from './GoogleFonts'
import Catch from './Catch'

const NORMAL = 'normal'
const PRESENTER = 'presenter'
const OVERVIEW = 'overview'
const GRID = 'grid'
const PRINT = 'print'
const modes = {
  NORMAL,
  PRESENTER,
  OVERVIEW,
  GRID,
  PRINT,
}

const STORAGE_INDEX = 'mdx-slide'
const STORAGE_STEP = 'mdx-step'

const keys = {
  right: 39,
  left: 37,
  space: 32,
  p: 80,
  o: 79,
  g: 71,
}

const toggleMode = key => state => ({
  mode: state.mode === key ? NORMAL : key,
})

const BaseWrapper = props => <>{props.children}</>

const inputElements = ['INPUT', 'TEXTAREA', 'A', 'BUTTON']

export class MDXDeck extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      slides: props.slides,
      step: 0,
      mode: NORMAL,
      update: fn => this.setState(fn),
    }
  }

  handleKeyDown = e => {
    const { basepath } = this.props
    const { keyCode, metaKey, ctrlKey, altKey, shiftKey } = e
    const { activeElement } = document
    if (inputElements.includes(activeElement.tagName)) {
      return
    }
    if (metaKey || ctrlKey) return
    const alt = altKey && !shiftKey

    const { pathname } = globalHistory.location
    if (keyCode === keys.p && shiftKey && altKey) {
      navigate(basepath + '/print')
      this.setState({ mode: 'print' })
    }
    if (pathname === '/print') return

    if (alt) {
      switch (keyCode) {
        case keys.p:
          this.setState(toggleMode(PRESENTER))
          break
        case keys.o:
          this.setState(toggleMode(OVERVIEW))
          break
        case keys.g:
          this.setState(toggleMode(GRID))
          break
        default:
          break
      }
    } else {
      switch (keyCode) {
        case keys.left:
          e.preventDefault()
          this.previous()
          break
        case keys.right:
        case keys.space:
          e.preventDefault()
          this.next()
          break
        default:
          break
      }
    }
  }

  getIndex = () => {
    const { basepath } = this.props
    const { pathname } = globalHistory.location
    const pagepath = pathname.replace(basepath, '')
    const n = Number(pagepath.split('/')[1])
    const index = isNaN(n) ? 0 : n
    return index
  }

  getMeta = i => {
    const { slides } = this.state
    const { meta = {} } = slides[i] || {}
    return meta
  }

  goto = i => {
    const { basepath } = this.props
    const current = this.getIndex()
    const reverse = i < current
    navigate(basepath + '/' + i)
    const meta = this.getMeta(i)
    this.setState({
      step: reverse ? meta.steps || 0 : 0,
    })
  }

  previous = () => {
    const { step } = this.state
    const index = this.getIndex()
    const meta = this.getMeta(index)
    if (meta.steps && step > 0) {
      this.setState(state => ({
        step: state.step - 1,
      }))
    } else {
      const previous = index - 1
      if (previous < 0) return
      this.goto(previous)
    }
  }

  next = () => {
    const { slides, step } = this.state
    const index = this.getIndex()
    const meta = this.getMeta(index)
    if (meta.steps && step < meta.steps) {
      this.setState(state => ({
        step: state.step + 1,
      }))
    } else {
      const next = index + 1
      if (next > slides.length - 1) return
      this.goto(next)
    }
  }

  register = (index, meta) => {
    const { slides } = this.state
    const initialMeta = slides[index].meta || {}
    slides[index].meta = { ...initialMeta, ...meta }
    this.setState({ slides })
  }

  handleStorageChange = e => {
    const { key } = e
    switch (key) {
      case STORAGE_INDEX:
        const index = parseInt(e.newValue, 10)
        this.goto(index)
        break
      case STORAGE_STEP:
        const step = parseInt(e.newValue, 10)
        this.setState({ step })
        break
      default:
        break
    }
  }

  getMode = () => {
    const query = querystring.parse(
      globalHistory.location.search.replace(/^\?/, '')
    )
    this.setState(query)
  }

  componentDidMount() {
    document.body.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('storage', this.handleStorageChange)
    this.getMode()
  }

  componentWillUnmount() {
    document.body.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('storage', this.handleStorageChange)
  }

  componentDidUpdate() {
    const index = this.getIndex()
    const { step, mode } = this.state
    const { pathname, search } = globalHistory.location
    localStorage.setItem(STORAGE_INDEX, index)
    localStorage.setItem(STORAGE_STEP, step)

    if (mode !== NORMAL && mode !== PRINT) {
      const query = '?' + querystring.stringify({ mode })
      if (query === search) return
      navigate(query)
    } else {
      if (!search) return
      navigate(pathname)
    }
  }

  componentDidCatch(err) {
    console.error('componentDidCatch')
    console.error(err)
  }

  render() {
    const { basepath } = this.props
    const { pathname } = globalHistory.location
    const { slides } = this.state
    const pagepath = pathname.replace(basepath, '')
    const mode = pagepath === '/print' ? PRINT : this.state.mode
    const index = this.getIndex()
    const context = {
      ...this.state,
      register: this.register,
    }

    const [FirstSlide] = slides

    let Wrapper = BaseWrapper
    switch (mode) {
      case PRESENTER:
        Wrapper = Presenter
        break
      case OVERVIEW:
        Wrapper = Overview
        break
      case GRID:
        Wrapper = Grid
        break
      default:
        break
    }

    return (
      <Provider {...this.props} {...this.state} mode={mode} index={index}>
        <Catch>
          <GoogleFonts />
          <Wrapper {...this.props} {...this.state} modes={modes} index={index}>
            <Swipeable onSwipedRight={this.previous} onSwipedLeft={this.next}>
              <Router basepath={basepath}>
                <Slide path="/" index={0} context={context}>
                  <FirstSlide path="/" />
                </Slide>
                {slides.map((Component, i) => (
                  <Slide key={i} path={i + '/*'} index={i} {...context}>
                    <Component path={i + '/*'} />
                  </Slide>
                ))}
                <Print path="print" {...this.props} />
              </Router>
            </Swipeable>
          </Wrapper>
        </Catch>
      </Provider>
    )
  }
}

MDXDeck.propTypes = {
  slides: PropTypes.array.isRequired,
  headTags: PropTypes.array.isRequired,
}

MDXDeck.defaultProps = {
  basepath: '',
  slides: [],
  headTags: [],
}

export default MDXDeck
