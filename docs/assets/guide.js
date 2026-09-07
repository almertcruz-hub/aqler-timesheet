async function copyCode(button) {
  const code = button.parentElement.querySelector('code').textContent

  try {
    await navigator.clipboard.writeText(code)
    button.textContent = 'Copied'
  } catch {
    button.textContent = 'Copy failed'
  }

  window.setTimeout(() => {
    button.textContent = 'Copy'
  }, 1200)
}

function addCopyButton(wrapper, label = 'Copy code') {
  if (wrapper.querySelector('.copy-code')) return

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'copy-code'
  button.textContent = 'Copy'
  button.setAttribute('aria-label', label)
  button.addEventListener('click', () => copyCode(button))
  wrapper.prepend(button)
}

const bookmarkKey = 'aqler-guide-bookmarks'

function readBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(bookmarkKey) || '[]')
  } catch {
    return []
  }
}

function writeBookmarks(bookmarks) {
  try {
    localStorage.setItem(bookmarkKey, JSON.stringify(bookmarks))
  } catch {
    // Bookmarks remain optional if browser storage is unavailable.
  }
  document.dispatchEvent(new CustomEvent('aqler-bookmarks-changed'))
}

function toggleBookmark(bookmark) {
  const bookmarks = readBookmarks()
  const exists = bookmarks.some((item) => item.id === bookmark.id)
  writeBookmarks(exists
    ? bookmarks.filter((item) => item.id !== bookmark.id)
    : [...bookmarks, bookmark])
}

function isBookmarked(id) {
  return readBookmarks().some((item) => item.id === id)
}

function renderCompleteSource(moduleId, codePanel) {
  const files = window.AQLER_SOURCE_GUIDE?.[moduleId]
  if (!files?.length) return

  const totalLines = files.reduce((total, file) => total + file.lineCount, 0)
  const totalChunks = files.reduce((total, file) => total + file.chunks.length, 0)
  const chapters = [...new Set(files.flatMap((file) => file.chunks.map((chunk) => chunk.chapter)))]
  const workflows = [...new Set(files.flatMap((file) => file.chunks.map((chunk) => chunk.workflow)))]
  const guide = document.createElement('section')
  guide.className = 'complete-source-guide'

  const header = document.createElement('header')
  const headingGroup = document.createElement('div')
  const heading = document.createElement('h3')
  const description = document.createElement('p')
  const badge = document.createElement('span')
  const headerControls = document.createElement('div')
  const expandAll = document.createElement('button')
  const collapseAll = document.createElement('button')
  const learningControls = document.createElement('div')
  const modeControls = document.createElement('div')
  const guidedMode = document.createElement('button')
  const completeMode = document.createElement('button')
  const previousChapter = document.createElement('button')
  const nextChapter = document.createElement('button')
  const chapterPicker = document.createElement('select')
  const workflowPicker = document.createElement('select')
  const visibleCount = document.createElement('span')
  const levelControls = document.createElement('div')
  const levelLabel = document.createElement('span')
  const levelButtons = ['plain', 'beginner', 'technical'].map((level) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.dataset.learningLevel = level
    button.textContent = level === 'plain' ? 'Plain English' : level === 'beginner' ? 'Beginner code' : 'Technical detail'
    return button
  })
  let mode = 'complete'
  let activeChapter = chapters[0] || 'all'
  let learningLevel = 'plain'
  try {
    learningLevel = localStorage.getItem('aqler-learning-level') || 'plain'
  } catch {
    learningLevel = 'plain'
  }

  heading.textContent = 'Complete current source'
  description.className = 'muted'
  description.textContent = 'The complete source is divided into notebook-style logical cells. Read one code cell, then its explanation, before continuing to the next cell.'
  badge.className = 'coverage-badge'
  badge.textContent = `${files.length} ${files.length === 1 ? 'file' : 'files'} · ${totalChunks} cells · ${totalLines} lines covered`
  expandAll.className = 'source-control'
  expandAll.type = 'button'
  expandAll.textContent = 'Expand all files'
  collapseAll.className = 'source-control'
  collapseAll.type = 'button'
  collapseAll.textContent = 'Collapse all files'
  expandAll.addEventListener('click', () => {
    guide.querySelectorAll('.source-file').forEach((details) => { details.open = true })
  })
  collapseAll.addEventListener('click', () => {
    guide.querySelectorAll('.source-file').forEach((details) => { details.open = false })
  })

  learningControls.className = 'guided-source-controls'
  modeControls.className = 'source-mode-controls'
  guidedMode.type = 'button'
  completeMode.type = 'button'
  previousChapter.type = 'button'
  nextChapter.type = 'button'
  guidedMode.textContent = 'Guided chapters'
  completeMode.textContent = 'Complete source'
  previousChapter.textContent = '← Previous chapter'
  nextChapter.textContent = 'Next chapter →'
  chapterPicker.setAttribute('aria-label', 'Choose a learning chapter')
  workflowPicker.setAttribute('aria-label', 'Filter cells by current execution')
  visibleCount.className = 'visible-cell-count'
  levelControls.className = 'learning-level-controls'
  levelLabel.textContent = 'Explanation level:'
  chapters.forEach((chapter) => chapterPicker.add(new Option(chapter, chapter)))
  workflowPicker.add(new Option('All executions', 'all'))
  workflows.forEach((workflow) => workflowPicker.add(new Option(workflow, workflow)))
  modeControls.append(guidedMode, completeMode)
  levelControls.append(levelLabel, ...levelButtons)
  learningControls.append(levelControls, modeControls, chapterPicker, workflowPicker, previousChapter, nextChapter, visibleCount)

  headingGroup.append(heading, description)
  headerControls.append(badge, expandAll, collapseAll)
  header.append(headingGroup, headerControls)
  guide.append(header, learningControls)

  files.forEach((file, index) => {
    const fileDetails = document.createElement('details')
    fileDetails.className = 'source-file'

    const summary = document.createElement('summary')
    const path = document.createElement('code')
    const count = document.createElement('span')
    path.textContent = file.path
    count.textContent = `${file.chunks.length} cells · ${file.lineCount} lines`
    summary.append(path, count)

    const fileBody = document.createElement('div')
    fileBody.className = 'source-file-body'
    const fileCoverage = document.createElement('div')
    fileCoverage.className = 'file-coverage-banner'
    fileCoverage.innerHTML = `<strong>Complete file included</strong><span>Lines 1–${file.lineCount} of ${file.lineCount} are embedded below. Use Guided chapters only when you intentionally want a smaller learning section.</span>`
    const cellNavigator = document.createElement('div')
    const cellNavigatorLabel = document.createElement('label')
    const cellPicker = document.createElement('select')
    const cellControls = document.createElement('div')
    const expandCells = document.createElement('button')
    const collapseCells = document.createElement('button')
    const cellPickerId = `${moduleId}-file-${index + 1}-cell-picker`
    cellNavigator.className = 'cell-navigator'
    cellControls.className = 'cell-navigation-controls'
    cellNavigatorLabel.textContent = 'Jump directly to a notebook cell'
    cellNavigatorLabel.htmlFor = cellPickerId
    cellPicker.id = cellPickerId
    cellPicker.setAttribute('aria-label', `Choose a cell in ${file.path}`)
    cellPicker.innerHTML = '<option value="">Choose a cell…</option>'
    expandCells.className = 'source-control'
    expandCells.type = 'button'
    expandCells.textContent = 'Expand all cells'
    collapseCells.className = 'source-control'
    collapseCells.type = 'button'
    collapseCells.textContent = 'Collapse all cells'
    const notebook = document.createElement('div')
    notebook.className = 'notebook'

    file.chunks.forEach((chunk, chunkIndex) => {
      const cell = document.createElement('details')
      cell.className = 'notebook-cell'
      cell.open = index === 0 && chunkIndex === 0
      cell.dataset.chapter = chunk.chapter
      cell.dataset.workflow = chunk.workflow
      cell.dataset.bookmarkId = `${moduleId}|${file.path}|${chunkIndex}`

      const cellHeader = document.createElement('summary')
      const number = document.createElement('span')
      const title = document.createElement('strong')
      const range = document.createElement('small')
      const askButton = document.createElement('button')
      const bookmarkButton = document.createElement('button')
      number.className = 'cell-number'
      number.textContent = String(chunkIndex + 1)
      title.textContent = chunk.title
      range.textContent = chunk.startLine === chunk.endLine
        ? `Line ${chunk.startLine}`
        : `Lines ${chunk.startLine}–${chunk.endLine}`
      askButton.type = 'button'
      askButton.className = 'ask-cell'
      askButton.textContent = '? Ask'
      askButton.setAttribute('aria-label', `Ask the guide about ${chunk.title}`)
      askButton.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        document.dispatchEvent(new CustomEvent('aqler-guide-ask-context', {
          detail: { moduleId, filePath: file.path, chunkIndex, chunk },
        }))
      })
      bookmarkButton.type = 'button'
      bookmarkButton.className = 'bookmark-cell'
      bookmarkButton.setAttribute('aria-label', `Bookmark ${chunk.title}`)
      const updateBookmarkButton = () => {
        const selected = isBookmarked(cell.dataset.bookmarkId)
        bookmarkButton.textContent = selected ? '★' : '☆'
        bookmarkButton.title = selected ? 'Remove bookmark' : 'Save this cell as a bookmark'
        bookmarkButton.setAttribute('aria-pressed', String(selected))
      }
      bookmarkButton.addEventListener('click', (event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleBookmark({
          id: cell.dataset.bookmarkId,
          moduleId,
          filePath: file.path,
          chunkIndex,
          title: chunk.title,
          range: range.textContent,
        })
        updateBookmarkButton()
      })
      document.addEventListener('aqler-bookmarks-changed', updateBookmarkButton)
      updateBookmarkButton()
      cellHeader.append(number, title, range, askButton, bookmarkButton)

      const cellOption = document.createElement('option')
      cellOption.value = String(chunkIndex)
      cellOption.textContent = `${chunkIndex + 1}. ${chunk.title}`
      cellOption.dataset.chapter = chunk.chapter
      cellOption.dataset.workflow = chunk.workflow
      cellPicker.append(cellOption)

      const cellTags = document.createElement('div')
      cellTags.className = 'cell-tags'
      cellTags.innerHTML = `<span>${chunk.chapter}</span><span>${chunk.workflow}</span><span class="timing-tag">⏱ ${chunk.timing}</span>`
      cell.append(cellHeader)

      const materialize = () => {
        if (cell.dataset.rendered === 'true') return
        cell.dataset.rendered = 'true'
        cell.append(cellTags)

        const wrapper = document.createElement('div')
        wrapper.className = 'code-wrap'
        const pre = document.createElement('pre')
        const code = document.createElement('code')
        code.textContent = chunk.code
        pre.append(code)
        wrapper.append(pre)
        addCopyButton(wrapper, `Copy ${file.path} ${range.textContent}`)
        cell.append(wrapper)

        const plain = document.createElement('section')
        plain.className = 'cell-level cell-level-plain'
        plain.dataset.levelSection = 'plain'
        plain.innerHTML = `<div class="plain-summary"><strong>In everyday words</strong><p></p></div>`
        plain.querySelector('p').textContent = chunk.plainExplanation

        const timing = document.createElement('article')
        timing.className = 'timing-card'
        timing.innerHTML = '<h4>When does this run?</h4><p></p>'
        timing.querySelector('p').textContent = chunk.timing
        plain.append(timing)

        if (chunk.contract) {
          const contract = document.createElement('article')
          contract.className = 'function-contract-card'
          contract.innerHTML = `<h4>Function input → work → output</h4><div><span><small>Receives</small>${chunk.contract.input}</span><b>→</b><span><small>Does</small>${chunk.contract.work}</span><b>→</b><span><small>Returns / changes</small>${chunk.contract.output}</span></div>`
          plain.append(contract)
        }

        if (chunk.variables?.length) {
          const variables = document.createElement('article')
          variables.className = 'variable-cards'
          variables.innerHTML = '<h4>Know these names before continuing</h4>'
          const grid = document.createElement('div')
          chunk.variables.forEach((variable) => {
            const card = document.createElement('div')
            card.innerHTML = `<code>${variable.name}</code><span>${variable.type}</span><p>${variable.meaning}</p><small>Example: ${variable.example}</small>`
            grid.append(card)
          })
          variables.append(grid)
          plain.append(variables)
        }

        if (chunk.comparison?.length) {
          const comparison = document.createElement('article')
          comparison.className = 'concept-comparison'
          comparison.innerHTML = '<h4>Do not mix up these similar ideas</h4><div class="table-wrap"><table><thead><tr><th>Name</th><th>What it actually means</th><th>Example</th></tr></thead><tbody></tbody></table></div>'
          const body = comparison.querySelector('tbody')
          chunk.comparison.forEach(([name, meaning, example]) => {
            const row = document.createElement('tr')
            row.innerHTML = `<td><code>${name}</code></td><td>${meaning}</td><td>${example}</td>`
            body.append(row)
          })
          plain.append(comparison)
        }

        if (chunk.changes) {
          const changes = document.createElement('article')
          changes.className = 'what-changes-card'
          changes.innerHTML = `<h4>What changes?</h4><div><span><small>Before</small>${chunk.changes.before}</span><b>→</b><span><small>Action</small>${chunk.changes.action}</span><b>→</b><span><small>After</small>${chunk.changes.after}</span></div>`
          plain.append(changes)
        }

        if (chunk.playback) {
          const playback = document.createElement('article')
          playback.className = 'execution-playback'
          playback.innerHTML = `<h4>${chunk.playback.title}</h4><div class="playback-stage"><strong></strong><pre></pre><p></p></div><div class="playback-controls"><button type="button">← Previous step</button><span></span><button type="button">Run next step →</button></div>`
          let activeStep = 0
          const [previous, next] = playback.querySelectorAll('button')
          const renderStep = () => {
            const step = chunk.playback.steps[activeStep]
            playback.querySelector('.playback-stage strong').textContent = step.label
            playback.querySelector('.playback-stage pre').textContent = step.values
            playback.querySelector('.playback-stage p').textContent = step.result
            playback.querySelector('.playback-controls span').textContent = `Step ${activeStep + 1} of ${chunk.playback.steps.length}`
            previous.disabled = activeStep === 0
            next.disabled = activeStep === chunk.playback.steps.length - 1
          }
          previous.addEventListener('click', () => { activeStep -= 1; renderStep() })
          next.addEventListener('click', () => { activeStep += 1; renderStep() })
          renderStep()
          plain.append(playback)
        }

        if (chunk.glossary?.length) {
          const glossary = document.createElement('article')
          glossary.className = 'cell-glossary'
          glossary.innerHTML = '<h4>Words used here</h4><div></div>'
          chunk.glossary.forEach(({ term, definition }) => {
            const word = document.createElement('abbr')
            word.textContent = term
            word.title = definition
            word.tabIndex = 0
            word.setAttribute('aria-label', `${term}: ${definition}`)
            glossary.querySelector('div').append(word)
          })
          plain.append(glossary)
        }

        if (chunk.exercise) {
          const exercise = document.createElement('article')
          exercise.className = 'cell-exercise'
          exercise.innerHTML = `<h4>Try this with real values</h4><p>${chunk.exercise.question}</p><details><summary>Show a hint</summary><p>${chunk.exercise.hint}</p></details><details><summary>Reveal the answer</summary><p>${chunk.exercise.answer}</p></details>`
          plain.append(exercise)
        }
        cell.append(plain)

        const beginner = document.createElement('section')
        beginner.className = 'cell-level cell-level-beginner'
        beginner.dataset.levelSection = 'beginner'
        const explanation = document.createElement('div')
        explanation.className = 'cell-explanation'
        explanation.innerHTML = '<strong>What this cell does</strong><p></p>'
        explanation.querySelector('p').textContent = chunk.explanation

        if (chunk.lineDetails?.length) {
          const lineByLine = document.createElement('div')
          lineByLine.className = 'line-by-line'
          lineByLine.innerHTML = '<strong>Line-by-line explanation</strong><ol></ol>'
          chunk.lineDetails.forEach((detail) => {
            const item = document.createElement('li')
            item.innerHTML = `<span>Line ${detail.line}</span><code></code><p></p>`
            item.querySelector('code').textContent = detail.code
            item.querySelector('p').textContent = detail.explanation
            lineByLine.querySelector('ol').append(item)
          })
          explanation.append(lineByLine)
        }
        beginner.append(explanation)

        if (chunk.beginnerNotes?.length) {
          const beginnerHelp = document.createElement('div')
          beginnerHelp.className = 'beginner-help'
          beginnerHelp.innerHTML = '<strong>If you have never coded before</strong>'
          chunk.beginnerNotes.forEach((note) => {
            const article = document.createElement('article')
            article.innerHTML = '<h4></h4><p></p><pre><code></code></pre>'
            article.querySelector('h4').textContent = note.title
            article.querySelector('p').textContent = note.explanation
            article.querySelector('code').textContent = note.example
            beginnerHelp.append(article)
          })
          beginner.append(beginnerHelp)
        }

        const readAloud = document.createElement('div')
        readAloud.className = 'cell-read-aloud'
        readAloud.innerHTML = '<strong>Read this code aloud</strong><p></p>'
        readAloud.querySelector('p').textContent = chunk.readAloud
        beginner.append(readAloud)
        cell.append(beginner)

        const technical = document.createElement('section')
        technical.className = 'cell-level cell-level-technical'
        technical.dataset.levelSection = 'technical'
        if (chunk.syntax?.length) {
          const syntax = document.createElement('div')
          syntax.className = 'cell-syntax'
          syntax.innerHTML = '<strong>Syntax decoded</strong><dl></dl>'
          chunk.syntax.forEach((note) => {
            const item = document.createElement('div')
            item.innerHTML = '<dt></dt><dd></dd>'
            item.querySelector('dt').textContent = note.term
            item.querySelector('dd').textContent = note.explanation
            syntax.querySelector('dl').append(item)
          })
          technical.append(syntax)
        } else {
          technical.innerHTML = '<p class="muted technical-empty">This cell introduces no additional special syntax beyond the earlier levels.</p>'
        }
        cell.append(technical)
        cell.querySelectorAll('[data-level-section]').forEach((section) => {
          section.hidden = section.dataset.levelSection !== learningLevel
        })
      }

      cell.addEventListener('toggle', () => {
        if (cell.open) materialize()
      })
      if (cell.open) materialize()

      notebook.append(cell)
    })

    cellPicker.addEventListener('change', () => {
      const target = notebook.children[Number(cellPicker.value)]
      if (target) target.open = true
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      cellPicker.value = ''
    })
    expandCells.addEventListener('click', () => {
      notebook.querySelectorAll('.notebook-cell').forEach((cell) => { cell.open = true })
    })
    collapseCells.addEventListener('click', () => {
      notebook.querySelectorAll('.notebook-cell').forEach((cell) => { cell.open = false })
    })
    cellControls.append(expandCells, collapseCells)
    cellNavigator.append(cellNavigatorLabel, cellPicker, cellControls)
    fileBody.append(fileCoverage, cellNavigator, notebook)
    fileDetails.append(summary, fileBody)
    guide.append(fileDetails)
  })

  const updateVisibility = () => {
    const selectedWorkflow = workflowPicker.value
    let visibleCells = 0
    guide.querySelectorAll('.source-file').forEach((fileDetails) => {
      let visibleInFile = 0
      const cells = [...fileDetails.querySelectorAll('.notebook-cell')]
      cells.forEach((cell) => {
        const chapterMatches = mode === 'complete' || cell.dataset.chapter === activeChapter
        const workflowMatches = selectedWorkflow === 'all' || cell.dataset.workflow === selectedWorkflow
        cell.hidden = !(chapterMatches && workflowMatches)
        if (!cell.hidden) {
          visibleCells += 1
          visibleInFile += 1
        }
      })
      fileDetails.hidden = visibleInFile === 0
      if (visibleInFile > 0 && mode === 'guided') fileDetails.open = true

      const picker = fileDetails.querySelector('.cell-navigator select')
      picker?.querySelectorAll('option:not(:first-child)').forEach((option) => {
        const chapterMatches = mode === 'complete' || option.dataset.chapter === activeChapter
        const workflowMatches = selectedWorkflow === 'all' || option.dataset.workflow === selectedWorkflow
        option.hidden = !(chapterMatches && workflowMatches)
      })
    })

    chapterPicker.disabled = mode === 'complete'
    previousChapter.disabled = mode === 'complete' || chapters.indexOf(activeChapter) === 0
    nextChapter.disabled = mode === 'complete' || chapters.indexOf(activeChapter) === chapters.length - 1
    guidedMode.setAttribute('aria-pressed', String(mode === 'guided'))
    completeMode.setAttribute('aria-pressed', String(mode === 'complete'))
    visibleCount.textContent = `${visibleCells} of ${totalChunks} cells shown`
  }

  const updateLearningLevel = (nextLevel = learningLevel) => {
    learningLevel = ['plain', 'beginner', 'technical'].includes(nextLevel) ? nextLevel : 'plain'
    levelButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.learningLevel === learningLevel))
    })
    guide.querySelectorAll('[data-level-section]').forEach((section) => {
      section.hidden = section.dataset.levelSection !== learningLevel
    })
  }

  levelButtons.forEach((button) => {
    button.addEventListener('click', () => {
      try {
        localStorage.setItem('aqler-learning-level', button.dataset.learningLevel)
      } catch {
        // The level still changes for this visit without browser storage.
      }
      document.dispatchEvent(new CustomEvent('aqler-learning-level-changed', {
        detail: button.dataset.learningLevel,
      }))
    })
  })
  document.addEventListener('aqler-learning-level-changed', (event) => {
    updateLearningLevel(event.detail)
  })

  guidedMode.addEventListener('click', () => {
    mode = 'guided'
    updateVisibility()
  })
  completeMode.addEventListener('click', () => {
    mode = 'complete'
    updateVisibility()
  })
  chapterPicker.addEventListener('change', () => {
    activeChapter = chapterPicker.value
    updateVisibility()
  })
  workflowPicker.addEventListener('change', updateVisibility)
  previousChapter.addEventListener('click', () => {
    activeChapter = chapters[Math.max(0, chapters.indexOf(activeChapter) - 1)]
    chapterPicker.value = activeChapter
    updateVisibility()
  })
  nextChapter.addEventListener('click', () => {
    activeChapter = chapters[Math.min(chapters.length - 1, chapters.indexOf(activeChapter) + 1)]
    chapterPicker.value = activeChapter
    updateVisibility()
  })

  codePanel.replaceChildren(guide)
  updateVisibility()
  updateLearningLevel()
}

function renderFunctionGuide(moduleId, panel) {
  const files = window.AQLER_SOURCE_GUIDE?.[moduleId]
  if (!files?.length) return
  const entries = files.flatMap((file) => file.functions.map((item) => ({ ...item, file })))
  const guide = document.createElement('section')
  guide.className = 'function-guide'
  const header = document.createElement('header')
  header.innerHTML = `<p class="eyebrow">Whole-function view</p><h3>Understand complete jobs, not disconnected lines</h3><p>This view treats each function as one named recipe. Start with why it exists, then follow its inputs, complete story, result, and helpers. Open the source only after the story makes sense.</p>`
  guide.append(header)

  if (!entries.length) {
    const empty = document.createElement('div')
    empty.className = 'function-empty'
    empty.innerHTML = '<h3>This module is not organized around JavaScript functions</h3><p>It mainly contains configuration, styles, or database instructions. The cards below group those instructions by the complete job they perform.</p>'
    const workflows = [...new Set(files.flatMap((file) => file.chunks.map((chunk) => chunk.workflow)))]
    const grid = document.createElement('div')
    grid.className = 'workflow-fallback-grid'
    workflows.forEach((workflow) => {
      const chunks = files.flatMap((file) => file.chunks).filter((chunk) => chunk.workflow === workflow)
      const card = document.createElement('article')
      card.innerHTML = `<h4>${workflow}</h4><p>${chunks[0]?.plainExplanation || 'This group completes one part of the module’s setup.'}</p><small>${chunks.length} focused cells in the Code chunks view</small>`
      grid.append(card)
    })
    empty.append(grid)
    guide.append(empty)
    panel.replaceChildren(guide)
    return
  }

  const navigator = document.createElement('div')
  navigator.className = 'function-navigator'
  const navigatorLabel = document.createElement('label')
  const picker = document.createElement('select')
  const position = document.createElement('span')
  navigatorLabel.textContent = 'Jump to a whole function'
  picker.setAttribute('aria-label', `Choose a whole function in ${moduleId}`)
  picker.innerHTML = '<option value="">Choose a function…</option>'
  position.textContent = `${entries.length} complete ${entries.length === 1 ? 'function' : 'functions'}`
  navigatorLabel.append(picker)
  navigator.append(navigatorLabel, position)
  guide.append(navigator)

  entries.forEach(({ file, ...item }, functionIndex) => {
    const card = document.createElement('article')
    const bookmarkId = `function|${moduleId}|${file.path}|${item.name}|${item.startLine}`
    card.className = 'function-story'
    card.dataset.functionBookmarkId = bookmarkId
    card.id = `${moduleId}-function-${functionIndex + 1}`

    const cardHeader = document.createElement('header')
    const heading = document.createElement('div')
    const bookmark = document.createElement('button')
    heading.innerHTML = `<span>${file.path} · Lines ${item.startLine}–${item.endLine}</span><h3>${item.name}</h3><code>${item.signature}</code>`
    bookmark.type = 'button'
    bookmark.className = 'bookmark-function'
    const updateFunctionBookmark = () => {
      const selected = isBookmarked(bookmarkId)
      bookmark.textContent = selected ? '★ Bookmarked' : '☆ Bookmark function'
      bookmark.setAttribute('aria-pressed', String(selected))
    }
    bookmark.addEventListener('click', () => {
      toggleBookmark({ id: bookmarkId, kind: 'function', moduleId, filePath: file.path, title: item.name, range: `Lines ${item.startLine}–${item.endLine}` })
      updateFunctionBookmark()
    })
    document.addEventListener('aqler-bookmarks-changed', updateFunctionBookmark)
    updateFunctionBookmark()
    cardHeader.append(heading, bookmark)
    card.append(cardHeader)

    const bigPicture = document.createElement('section')
    bigPicture.className = 'function-big-picture'
    bigPicture.innerHTML = '<strong>Why this function exists</strong><p></p><aside></aside>'
    bigPicture.querySelector('p').textContent = item.purpose
    bigPicture.querySelector('aside').textContent = `Everyday comparison: ${item.analogy}`
    card.append(bigPicture)

    const contract = document.createElement('section')
    contract.className = 'whole-function-contract'
    contract.innerHTML = `<article><small>1. What goes in</small><p>${item.contract.input}</p></article><b>→</b><article><small>2. Complete job</small><p>${item.contract.work}</p></article><b>→</b><article><small>3. What comes out</small><p>${item.contract.output}</p></article>`
    card.append(contract)

    const story = document.createElement('section')
    story.className = 'function-steps'
    story.innerHTML = '<h4>The complete story, in order</h4><ol></ol>'
    const steps = item.steps.length ? item.steps : ['Receive the requested inputs.', 'Perform the grouped instructions from top to bottom.', 'Return a value or complete the described change.']
    steps.forEach((step) => {
      const row = document.createElement('li')
      row.textContent = step
      story.querySelector('ol').append(row)
    })
    card.append(story)

    const facts = document.createElement('section')
    facts.className = 'function-facts'
    facts.innerHTML = `<article><h4>Example</h4><p>${item.example}</p></article><article><h4>When it runs</h4><p>${item.timing}</p></article><article><h4>What it changes</h4><p>${item.changes}</p></article>`
    card.append(facts)

    if (item.variables.length) {
      const variables = document.createElement('section')
      variables.className = 'function-variables'
      variables.innerHTML = '<h4>Important names inside this function</h4><div></div>'
      item.variables.forEach((variable) => {
        const value = document.createElement('article')
        value.innerHTML = `<code>${variable.name}</code><small>${variable.type}</small><p>${variable.meaning}</p>`
        variables.querySelector('div').append(value)
      })
      card.append(variables)
    }

    if (item.calls.length) {
      const helpers = document.createElement('section')
      helpers.className = 'function-helpers'
      helpers.innerHTML = '<h4>Other functions or tools it asks for help</h4><div></div>'
      item.calls.forEach((call) => {
        const chip = document.createElement('code')
        chip.textContent = `${call}(…)`
        helpers.querySelector('div').append(chip)
      })
      card.append(helpers)
    }

    const sourceDetails = document.createElement('details')
    sourceDetails.className = 'whole-function-source'
    sourceDetails.innerHTML = `<summary>${item.oversized ? 'View the complete source (large component)' : 'View the complete function source'}</summary>`
    sourceDetails.addEventListener('toggle', () => {
      if (!sourceDetails.open || sourceDetails.dataset.rendered === 'true') return
      sourceDetails.dataset.rendered = 'true'
      const completeFile = file.chunks.map((chunk) => chunk.code).join('\n').split('\n')
      const source = completeFile.slice(item.startLine - 1, item.endLine).join('\n')
      const wrapper = document.createElement('div')
      wrapper.className = 'code-wrap'
      const pre = document.createElement('pre')
      const code = document.createElement('code')
      code.textContent = source
      pre.append(code)
      wrapper.append(pre)
      addCopyButton(wrapper, `Copy complete ${item.name} function`)
      sourceDetails.append(wrapper)
    })
    card.append(sourceDetails)
    guide.append(card)

    const option = document.createElement('option')
    option.value = card.id
    option.textContent = `${item.name} — ${file.path}`
    picker.append(option)
  })

  picker.addEventListener('change', () => {
    document.getElementById(picker.value)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    picker.value = ''
  })
  panel.replaceChildren(guide)
}

function flowImportance(chunk, filePath) {
  const code = chunk.code
  let score = 1
  if (/^(?:export\s+default\s+)?(?:async\s+)?function\s|^\s*const\s+\w+\s*=\s*(?:useCallback\(|(?:async\s*)?\()/m.test(code)) score += 12
  if (/useEffect\(/.test(code)) score += 11
  if (/useState\(/.test(code)) score += 9
  if (/\.from\(|supabase\.auth/.test(code)) score += 10
  if (/\.(insert|update|delete|upsert)\(/.test(code)) score += 4
  if (/on(Click|Change|Submit)=/.test(code)) score += 8
  if (/return \(|<[A-Za-z]/.test(code)) score += 7
  if (/\.(map|filter|find)\(/.test(code)) score += 6
  if (/create (table|policy|trigger|or replace function)|alter table|enable row level security/i.test(code)) score += 11
  if (filePath.endsWith('.css') && /[{:]|@/.test(code)) score += 6
  if (/^\s*(import |[}\])>,;]+\s*$)/m.test(code) && code.trim().split('\n').length < 3) score -= 5
  return score
}

function websiteEffectFor(moduleId, chunk) {
  const code = chunk.code
  if (/activeTab|setActiveTab/.test(code)) return "This controls which Shift workspace the administrator sees: recurring baseline, a specific week, or the read-only schedule preview."
  if (/buildWeekSchedule/.test(code)) return 'This produces the seven final day cards shown on the Shift page by placing exact-date exceptions over the normal weekly schedule.'
  if (/saveBaseline|\.from\('shifts'\)/.test(code) && /upsert|delete/.test(code)) return 'When the administrator saves, this changes the employee’s normal weekly shift rows in Supabase and then refreshes the schedule shown on the page.'
  if (/saveSpecificWeek|shift_overrides/.test(code) && /upsert|delete/.test(code)) return 'When the administrator saves a specific week, this stores or removes date exceptions and refreshes the seven displayed dates.'
  if (/getSession|onAuthStateChange/.test(code)) return 'This decides whether the app shows protected pages for the signed-in person or sends them to the login page.'
  if (/signInWithPassword/.test(code)) return 'Submitting the login form asks Supabase to verify the credentials; success opens the protected app and failure displays an error.'
  if (/signUp\(/.test(code)) return 'Submitting registration creates the Supabase Auth user when the form is valid, then the page displays the resulting status.'
  if (/timeIn|activeSession/.test(code) && /insert|select/.test(code)) return 'This starts or restores the employee’s open logs row. A null time_out changes the home controls to the working state.'
  if (/timeOut|\.from\('logs'\)/.test(code) && /update/.test(code)) return 'This finishes the same open logs row by adding time_out, then refreshes what the employee sees.'
  if (/exportLogs|Blob|createObjectURL/.test(code)) return 'Clicking Export CSV runs a separate batched query for every current search match, then creates a spreadsheet-compatible download independent of the visible page.'
  if (/debouncedSearch|refreshNumber|\.range\(/.test(code) && /admin_work_logs|fetchLogs/.test(code)) return 'A settled search, page change, or Refresh sends a new paginated reporting-view query and updates only the current table page.'
  if (/email_reminders/.test(code) && /insert|delete|upsert/.test(code)) return 'The administrator’s reminder form creates or removes an active scheduled-email row, and the visible schedule list is updated.'
  if (/Deno\.serve|api\.brevo|process-email-reminders/.test(code)) return 'This runs behind the website when Cron calls the Edge Function; due reminders are emailed and their delivery result is recorded.'
  if (/create policy|row level security|auth\.uid|auth\.jwt/i.test(code)) return 'Nothing new is drawn, but the database uses this rule to permit the correct employee or administrator request and reject unauthorized access.'
  if (/create table|alter table|constraint|references/i.test(code)) return 'Nothing is drawn directly. This defines the valid saved information that later React screens can load and display.'
  if (/useState\(/.test(code)) {
    const meanings = chunk.variables?.filter((variable) => variable.type !== 'function').map((variable) => variable.meaning)
    return meanings?.length ? meanings.join(' ') : 'This prepares the changing values that later determine the information and controls visible on this page.'
  }
  if (/useEffect\(|\.from\(|await /.test(code)) return 'This loads or changes information behind the page. A later state update causes React to display the completed result.'
  if (/on(Click|Change|Submit)=/.test(code)) return 'This connects a visible control to work that runs later when the user clicks, types, or submits the form.'
  if (/return \(|<[A-Za-z]/.test(code)) return 'This JSX directly controls the elements, text, forms, or layout the user sees in this part of the website.'
  if (/\.map\(/.test(code)) return 'This turns saved or calculated items into the repeated rows or cards displayed by the website.'
  if (/\.filter\(/.test(code)) return 'This decides which items remain available for the next calculation or visible list.'
  if (/\.css$/.test(chunk.filePath || '')) return 'This changes the appearance or responsive behavior of matching website elements without changing saved data.'
  return 'This prepares a value or rule used by a later step; its visible effect appears when that later code renders or handles an action.'
}

const flowVisualConfig = {
  startup: {
    image: 'assets/ui/login-desktop.png',
    overview: 'This is the first complete screen React can place inside the empty #root element.',
  },
  auth: {
    image: 'assets/ui/login-desktop.png',
    overview: 'The finished authentication interface combines the form JSX, React state, event handlers, and Tailwind appearance rules discussed below.',
  },
  navbar: {
    image: 'assets/ui/employee-dashboard.svg',
    overview: 'Look at the numbered navigation region at the top. Navbar.jsx produces that shared area on every protected page.',
  },
  timekeeping: {
    image: 'assets/ui/employee-dashboard.svg',
    overview: 'The timekeeping stages ultimately control the status card and Time In or Time Out controls marked in this employee screen.',
  },
  worklog: {
    image: 'assets/ui/employee-dashboard.svg',
    overview: 'The repeated log data becomes the work-log region in this picture. Each saved item produces another visible row.',
  },
  adminlogs: {
    image: 'assets/ui/admin-dashboard.svg',
    overview: 'Search, export, pagination, and fetched employee records meet in the administrator work-log table shown here.',
  },
  reminders: {
    image: 'assets/ui/admin-dashboard.svg',
    overview: 'The reminder form and active-schedule list are the visible result of the state, handlers, and database requests in this flow.',
  },
  processor: {
    image: 'assets/ui/admin-dashboard.svg',
    overview: 'The Edge Function itself has no screen. It works behind this administrator interface; its saved success or error results later appear in the reminder information.',
  },
  shifts: {
    image: 'assets/ui/shift-scheduler.svg',
    overview: 'Use the numbered regions in this picture while following the Shift flow. The code supplies the employee, tab, weekday editor, effective schedule cards, overnight checkboxes, day-off notes, and +1 day labels.',
  },
  database: {
    image: 'assets/ui/admin-dashboard.svg',
    overview: 'SQL does not draw this screen. It controls whether the React code is allowed to receive the records needed to fill it.',
  },
  styling: {
    image: 'assets/ui/login-desktop.png',
    overview: 'The elements come from JSX; their spacing, colors, widths, borders, and responsive behavior come from the CSS rules explained in this flow.',
  },
}

function isVisibleRenderChunk(chunk) {
  return /return\s*\(|<[A-Za-z]|className=|on(?:Click|Change|Submit)=/.test(chunk.code)
}

function flowAppearanceCaption(moduleId, chunk) {
  const code = chunk.code
  if (moduleId === 'shifts') {
    if (/activeTab|baseline|specific|week/.test(code)) return 'Look at the top tabs and the large workspace underneath them. activeTab decides which of those workspaces is present.'
    if (/selectedEmployee|employee/.test(code)) return 'Look at the employee selector near the top. Its current value decides whose weekday controls and schedule cards are filled.'
    if (/WEEKDAYS\.map|baselineDays|selectedDays/.test(code)) return 'Look at the seven weekday controls. map repeats one piece of JSX for Monday through Sunday, while state decides each day’s selected appearance.'
    if (/overnight|is_overnight/.test(code)) return 'Look for the Overnight checkbox and the +1 day label. The checkbox controls a Boolean on the day object; saving writes it as is_overnight, and rendering uses it to explain that the end belongs to tomorrow.'
    if (/weekSchedule\.map|shift_date|dateString/.test(code)) return 'Look at the seven dated schedule cards. This rendering code turns the calculated weekSchedule array into repeated cards with their mode, times, optional note, and overnight status.'
    return 'This block contributes to the numbered Shift interface shown here. Match its visible text, button, input, or className with the same item in the picture.'
  }
  if (moduleId === 'auth') {
    if (/<form|onSubmit/.test(code)) return 'The form is the centered panel. Its nested labels, inputs, status text, and submit button appear together inside that boundary.'
    if (/<input|onChange/.test(code)) return 'The bordered text boxes are these input elements. Typing fires onChange, updates state, and makes the current value appear inside the box.'
    return 'Match the text and element names in this JSX with the centered authentication panel in the picture.'
  }
  if (moduleId === 'navbar') return 'Look at the horizontal bar across the top: its links, avatar, email, administrator label, and sign-out control come from this shared JSX.'
  if (moduleId === 'timekeeping') return 'Look at the employee status and action region. React conditions decide which message and which time button are currently visible or disabled.'
  if (moduleId === 'worklog') return 'Look at the work-log list. The outer table is written once, while map produces one repeated row for every log object.'
  if (moduleId === 'adminlogs') return 'Look at the administrator heading, search/export controls, and employee table. This JSX supplies that visible region using the current filtered or paginated data.'
  if (moduleId === 'reminders') return 'Look at the reminder editor and active schedule cards. Form state fills the controls, and map repeats the saved reminder display.'
  if (moduleId === 'startup') return 'This rendering step is part of the chain that places the visible login page inside the browser’s #root container.'
  if (moduleId === 'styling') return 'The snapshot shows the final appearance produced when these CSS rules are applied to the matching JSX elements.'
  return 'This code contributes to the visible interface shown here. Match its element names and text with the corresponding screen region.'
}

function openGuideImageZoom(source, alt, captionText) {
  document.querySelector('.guide-image-lightbox')?.remove()

  const lightbox = document.createElement('div')
  const toolbar = document.createElement('div')
  const title = document.createElement('strong')
  const controls = document.createElement('div')
  const zoomOut = document.createElement('button')
  const reset = document.createElement('button')
  const zoomIn = document.createElement('button')
  const closeButton = document.createElement('button')
  const viewport = document.createElement('div')
  const image = document.createElement('img')
  const caption = document.createElement('p')
  let scale = 1

  lightbox.className = 'guide-image-lightbox'
  lightbox.setAttribute('role', 'dialog')
  lightbox.setAttribute('aria-modal', 'true')
  lightbox.setAttribute('aria-label', 'Enlarged interface picture')
  toolbar.className = 'guide-image-toolbar'
  title.textContent = 'Interface picture'
  controls.className = 'guide-image-controls'
  zoomOut.type = 'button'
  reset.type = 'button'
  zoomIn.type = 'button'
  closeButton.type = 'button'
  zoomOut.textContent = '− Zoom out'
  reset.textContent = '100%'
  zoomIn.textContent = '+ Zoom in'
  closeButton.textContent = 'Close ×'
  viewport.className = 'guide-image-viewport'
  image.src = source
  image.alt = alt
  caption.textContent = captionText

  const applyScale = () => {
    image.style.width = `${Math.round(scale * 90)}vw`
    reset.textContent = `${Math.round(scale * 100)}%`
    zoomOut.disabled = scale <= 0.5
    zoomIn.disabled = scale >= 3
  }
  const close = () => {
    document.removeEventListener('keydown', handleKey)
    lightbox.remove()
  }
  const handleKey = (event) => {
    if (event.key === 'Escape') close()
    if (event.key === '+' || event.key === '=') {
      scale = Math.min(3, scale + 0.25)
      applyScale()
    }
    if (event.key === '-') {
      scale = Math.max(0.5, scale - 0.25)
      applyScale()
    }
  }

  zoomOut.addEventListener('click', () => {
    scale = Math.max(0.5, scale - 0.25)
    applyScale()
  })
  reset.addEventListener('click', () => {
    scale = 1
    applyScale()
  })
  zoomIn.addEventListener('click', () => {
    scale = Math.min(3, scale + 0.25)
    applyScale()
  })
  closeButton.addEventListener('click', close)
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) close()
  })
  document.addEventListener('keydown', handleKey)

  controls.append(zoomOut, reset, zoomIn, closeButton)
  toolbar.append(title, controls)
  viewport.append(image, caption)
  lightbox.append(toolbar, viewport)
  document.body.append(lightbox)
  applyScale()
  closeButton.focus()
}

function addGuideImageZoom(image, captionText) {
  const button = document.createElement('button')
  const open = () => openGuideImageZoom(image.src, image.alt, captionText)
  button.type = 'button'
  button.className = 'guide-image-enlarge'
  button.textContent = '🔍 Enlarge image'
  button.addEventListener('click', open)
  image.classList.add('guide-image-zoomable')
  image.tabIndex = 0
  image.setAttribute('role', 'button')
  image.title = 'Select to open the zoom viewer'
  image.addEventListener('click', open)
  image.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      open()
    }
  })
  return button
}

function renderGuidedFlow(moduleId, panel) {
  const files = window.AQLER_SOURCE_GUIDE?.[moduleId]
  if (!files?.length) return

  const ordered = files.flatMap((file, fileIndex) => file.chunks.map((chunk, chunkIndex) => ({
    ...chunk,
    filePath: file.path,
    fileIndex,
    chunkIndex,
  })))
  const workflowGroups = new Map()
  ordered.forEach((chunk, sourceIndex) => {
    if (!workflowGroups.has(chunk.workflow)) workflowGroups.set(chunk.workflow, [])
    workflowGroups.get(chunk.workflow).push({ ...chunk, sourceIndex, importance: flowImportance(chunk, chunk.filePath) })
  })

  const guide = document.createElement('section')
  guide.className = 'guided-code-flow'
  const intro = document.createElement('header')
  intro.innerHTML = '<p class="eyebrow">Selected code in working order</p><h3>Follow the feature from setup to website result</h3><p>This view intentionally leaves out repetitive or supporting lines. Each stage keeps related code together and explains both the JavaScript/SQL syntax and what that stage changes for the person using the website.</p>'
  guide.append(intro)

  const visual = flowVisualConfig[moduleId]
  if (visual) {
    const appearance = document.createElement('section')
    appearance.className = 'flow-appearance-overview'
    const appearanceText = document.createElement('div')
    appearanceText.innerHTML = `<p class="eyebrow">Finished appearance</p><h3>Keep this screen beside the code</h3><p>${visual.overview}</p><p class="flow-picture-tip">When a later step says <strong>Where this appears</strong>, compare the JSX words—such as a heading, button label, or input—with this picture.</p>`
    const figure = document.createElement('figure')
    const image = document.createElement('img')
    const caption = document.createElement('figcaption')
    image.src = visual.image
    image.alt = `Finished ${moduleId} interface connected to the guided code flow`
    image.loading = 'lazy'
    caption.textContent = 'Appearance reference for this complete module. Use the zoom controls to inspect small labels and numbered regions.'
    const enlarge = addGuideImageZoom(image, caption.textContent)
    figure.append(image, enlarge, caption)
    appearance.append(appearanceText, figure)
    guide.append(appearance)
  }

  let stageNumber = 0
  workflowGroups.forEach((chunks, workflow) => {
    const selected = [...chunks]
      .sort((a, b) => b.importance - a.importance || a.sourceIndex - b.sourceIndex)
      .slice(0, 4)
      .sort((a, b) => a.sourceIndex - b.sourceIndex)
    if (!selected.length) return

    stageNumber += 1
    const stage = document.createElement('article')
    stage.className = 'flow-stage'
    const header = document.createElement('header')
    header.innerHTML = `<span>${stageNumber}</span><div><small>Stage ${stageNumber}</small><h3>${workflow}</h3><p>${selected[0].plainExplanation}</p></div>`
    stage.append(header)

    selected.forEach((chunk, index) => {
      const unit = document.createElement('section')
      unit.className = 'flow-code-unit'
      const unitHeader = document.createElement('header')
      const heading = document.createElement('h4')
      const location = document.createElement('small')
      const ask = document.createElement('button')
      heading.textContent = `${stageNumber}.${index + 1} ${chunk.title}`
      location.textContent = `${chunk.filePath} · Lines ${chunk.startLine}–${chunk.endLine}`
      ask.type = 'button'
      ask.textContent = '? Ask about this'
      ask.addEventListener('click', () => document.dispatchEvent(new CustomEvent('aqler-guide-ask-context', {
        detail: { moduleId, filePath: chunk.filePath, chunkIndex: chunk.chunkIndex, chunk },
      })))
      unitHeader.append(heading, location, ask)

      const codeWrap = document.createElement('div')
      codeWrap.className = 'code-wrap'
      const pre = document.createElement('pre')
      const code = document.createElement('code')
      code.textContent = chunk.code
      pre.append(code)
      codeWrap.append(pre)
      addCopyButton(codeWrap, `Copy ${chunk.title}`)

      let appearanceLink = null
      if (visual && isVisibleRenderChunk(chunk)) {
        appearanceLink = document.createElement('figure')
        appearanceLink.className = 'flow-code-appearance'
        const appearanceImage = document.createElement('img')
        const appearanceCaption = document.createElement('figcaption')
        const captionTitle = document.createElement('strong')
        const captionText = document.createElement('span')
        appearanceImage.src = visual.image
        appearanceImage.alt = `Screen location produced by ${chunk.title}`
        appearanceImage.loading = 'lazy'
        captionTitle.textContent = 'Where this appears'
        captionText.textContent = flowAppearanceCaption(moduleId, chunk)
        appearanceCaption.append(captionTitle, captionText)
        const enlarge = addGuideImageZoom(appearanceImage, captionText.textContent)
        appearanceLink.append(appearanceImage, enlarge, appearanceCaption)
      }

      const explanation = document.createElement('div')
      explanation.className = 'flow-explanation-grid'
      const syntax = document.createElement('article')
      const effect = document.createElement('article')
      syntax.innerHTML = '<h5>How to read the syntax</h5>'
      if (chunk.syntax?.length) {
        const list = document.createElement('dl')
        chunk.syntax.slice(0, 5).forEach((note) => {
          const row = document.createElement('div')
          const term = document.createElement('dt')
          const meaning = document.createElement('dd')
          term.textContent = note.term
          meaning.textContent = note.explanation
          row.append(term, meaning)
          list.append(row)
        })
        syntax.append(list)
      } else {
        const text = document.createElement('p')
        text.textContent = chunk.explanation
        syntax.append(text)
      }
      effect.innerHTML = '<h5>What this does for the website</h5>'
      const effectText = document.createElement('p')
      effectText.textContent = websiteEffectFor(moduleId, chunk)
      effect.append(effectText)
      explanation.append(syntax, effect)
      unit.append(unitHeader, codeWrap)
      if (appearanceLink) unit.append(appearanceLink)
      unit.append(explanation)
      stage.append(unit)
    })
    guide.append(stage)
  })
  panel.replaceChildren(guide)
}

const uiLessonConfig = {
  startup: { title: 'From the empty HTML root to the first React screen', intro: 'The browser begins with a small index.html shell. main.jsx mounts React into #root, App chooses a route, and the selected page component returns the visible JSX.', images: [['assets/ui/login-desktop.png', 'Real desktop login screen rendered by the current app.']] },
  auth: { title: 'Login and registration forms', intro: 'These screens use labels, controlled inputs, submit buttons, conditional error text, and links between routes. The mobile pictures show how the same JSX naturally narrows to one column.', images: [['assets/ui/login-desktop.png', 'Real current login screen — desktop.'], ['assets/ui/login-mobile.png', 'Real current login screen — 390px mobile viewport.'], ['assets/ui/register-desktop.png', 'Real current registration screen — desktop.'], ['assets/ui/register-mobile.png', 'Real current registration screen — 390px mobile viewport.']] },
  navbar: { title: 'Shared navigation and signed-in identity', intro: 'Navbar.jsx creates the top bar, route links, the email/avatar badge, the administrator label, and the sign-out action. Flexbox places the immediate children in a row until responsive rules wrap or constrain them.', images: [['assets/ui/employee-dashboard.svg', 'Annotated employee interface showing where the shared Navbar sits.']] },
  timekeeping: { title: 'Employee time controls and status feedback', intro: 'React state decides whether Time In or Time Out is available, whether an operation is loading, and what feedback appears. The JSX describes both possible states; conditions choose which one reaches the DOM.', images: [['assets/ui/employee-dashboard.svg', 'Annotated employee dashboard with the state-driven time controls.']] },
  worklog: { title: 'Repeated work-log rows', intro: 'The table structure is stable, but its body is data-driven. map visits the current log list and returns one row for each item. Responsive wrappers prevent the table from breaking the page on narrow screens.', images: [['assets/ui/employee-dashboard.svg', 'Annotated employee dashboard showing the work-log region produced from rows.']] },
  adminlogs: { title: 'Administrator server search, pagination, export, and employee table', intro: 'The page combines a controlled search field, 400 ms debounce, 20-row server page, manual refresh, and a separate batched all-results export. Layout classes move controls between stacked and horizontal arrangements as screen width changes.', images: [['assets/ui/admin-dashboard.svg', 'Annotated administrator logs and reminder interface.']] },
  reminders: { title: 'Recurring-email form and active schedule list', intro: 'Form state fills the employee, weekday, time, and message controls. Active reminder rows are rendered as cards with a row-specific cancel action and loading state.', images: [['assets/ui/admin-dashboard.svg', 'Annotated administrator interface showing reminder creation and active schedules.']] },
  processor: { title: 'Server behavior behind the reminder UI', intro: 'The Edge Function has no direct JSX. The administrator sees its results indirectly when reminder rows gain sent or error information. The picture shows the screen that relies on this background work.', images: [['assets/ui/admin-dashboard.svg', 'The visible administrator UI supported by the invisible email processor.']] },
  shifts: { title: 'Recurring shifts, exact-date overrides, overnight work, and employee preview', intro: 'Shift.jsx uses tabs, employee selection, weekday/date buttons, time inputs, overnight checkboxes, notes, week navigation, and seven repeated date cards. State chooses the current employee, tab, week, selections, and edited schedule values; Supabase stores overnight explicitly.', images: [['assets/ui/shift-scheduler.svg', 'Annotated administrator Shift scheduler showing the major visual regions and the state that controls them.']] },
  database: { title: 'Database rules behind every visible screen', intro: 'SQL does not create browser elements. It determines which rows the JSX is allowed to receive. When RLS rejects a request, React shows an error or empty state instead of protected information.', images: [['assets/ui/admin-dashboard.svg', 'The administrator UI can show cross-employee rows only because its database policies allow them.'], ['assets/ui/employee-dashboard.svg', 'The employee UI receives only that employee’s permitted rows.']] },
  styling: { title: 'Global CSS, Tailwind utilities, and responsive changes', intro: 'index.css establishes page-wide defaults. Tailwind classes written in JSX create most component styling. Prefixes such as sm:, md:, and lg: apply a utility only at or above that breakpoint.', images: [['assets/ui/login-desktop.png', 'Desktop layout produced from the same authentication JSX.'], ['assets/ui/login-mobile.png', 'Mobile layout after the viewport becomes narrower.'], ['assets/ui/shift-scheduler.svg', 'Annotated complex layout using flex, grid, gaps, borders, colors, and responsive wrapping.']] },
}

function tailwindMeaning(className) {
  const responsive = className.match(/^(sm|md|lg|xl):(.+)/)
  if (responsive) return `At the ${responsive[1]} breakpoint and wider, apply “${responsive[2]}”. Below that width this particular rule is inactive.`
  if (className === 'flex') return 'Lay immediate children along one flex axis. flex-row is the default direction.'
  if (className === 'flex-col') return 'Stack immediate children vertically from top to bottom.'
  if (className === 'grid') return 'Use CSS Grid so columns and rows can be defined for the immediate children.'
  if (/^grid-cols-/.test(className)) return 'Choose how many equal grid columns exist at this width.'
  if (/^gap-/.test(className)) return 'Add consistent empty space between flex or grid children without adding outer margin.'
  if (/^items-/.test(className)) return 'Align children across the flex or grid cross-axis.'
  if (/^justify-/.test(className)) return 'Distribute children along the main flex or grid axis.'
  if (className === 'w-full') return 'Make the element use all width offered by its parent.'
  if (/^(max|min)-w-/.test(className)) return 'Place a maximum or minimum width limit on the element.'
  if (/^p[trblxy]?-/.test(className)) return 'Add internal padding between the border and the element’s content.'
  if (/^m[trblxy]?-/.test(className)) return 'Add external margin between this element and surrounding elements.'
  if (/^rounded/.test(className)) return 'Round the element’s corners.'
  if (/^border/.test(className)) return 'Draw or color a boundary around the element.'
  if (/^bg-/.test(className)) return 'Set the element’s background color.'
  if (/^text-/.test(className)) return 'Set text color, size, alignment, or weight depending on the value.'
  if (/^font-/.test(className)) return 'Set the text weight or font family.'
  if (/^hover:/.test(className)) return 'Apply this appearance only while the pointer is over the element.'
  if (/^focus:/.test(className)) return 'Apply this appearance while the control has keyboard or input focus.'
  if (/^disabled:/.test(className)) return 'Apply this appearance while the control is disabled.'
  if (className === 'truncate') return 'Keep text on one line and replace overflow with an ellipsis.'
  if (/^overflow-/.test(className)) return 'Control whether content is clipped or given a scrolling area when it does not fit.'
  if (/^shadow/.test(className)) return 'Draw a shadow so the surface appears raised from the background.'
  if (/^(block|inline|hidden)$/.test(className)) return 'Control whether and how the element participates in page layout.'
  return 'A Tailwind utility that applies one focused visual or layout rule to this element.'
}

function renderUiGuide(moduleId, panel) {
  const files = window.AQLER_SOURCE_GUIDE?.[moduleId] || []
  const lesson = uiLessonConfig[moduleId] || uiLessonConfig.startup
  const guide = document.createElement('section')
  guide.className = 'ui-code-guide'
  const header = document.createElement('header')
  header.innerHTML = `<p class="eyebrow">Visual code walkthrough</p><h3>${lesson.title}</h3><p>${lesson.intro}</p>`
  guide.append(header)

  const foundation = document.createElement('section')
  foundation.className = 'ui-foundation-grid'
  foundation.innerHTML = `
    <article><h4>HTML element</h4><p>A browser building block such as <code>div</code>, <code>button</code>, <code>input</code>, or <code>table</code>. Opening and closing tags decide which elements contain other elements.</p></article>
    <article><h4>JSX</h4><p>React’s HTML-like JavaScript syntax. Curly braces insert current values or conditions. Use <code>className</code> instead of HTML’s <code>class</code>, and camelCase events such as <code>onClick</code>.</p></article>
    <article><h4>CSS / Tailwind</h4><p>Appearance and layout rules. Tailwind places small CSS utilities directly in <code>className</code>. A prefix such as <code>md:</code> makes that rule responsive.</p></article>
    <article><h4>React state</h4><p>Remembered values decide what JSX is produced. State does not style the page by itself; it changes the data and conditions that JSX reads during the next render.</p></article>
  `
  guide.append(foundation)

  const gallery = document.createElement('section')
  gallery.className = 'ui-picture-gallery'
  const galleryHeading = document.createElement('h3')
  galleryHeading.textContent = 'Picture first: identify the visible regions'
  gallery.append(galleryHeading)
  const pictures = document.createElement('div')
  lesson.images.forEach(([source, caption]) => {
    const figure = document.createElement('figure')
    const image = document.createElement('img')
    const text = document.createElement('figcaption')
    image.src = source
    image.alt = caption
    image.loading = 'lazy'
    text.textContent = caption
    figure.append(image, text)
    pictures.append(figure)
  })
  gallery.append(pictures)
  guide.append(gallery)

  const candidates = files.flatMap((file) => file.chunks.map((chunk, chunkIndex) => ({ ...chunk, filePath: file.path, chunkIndex })))
    .filter((chunk) => /\.jsx$|\.html$|\.css$/.test(chunk.filePath) && (/<[A-Za-z]|className=|@theme|@layer|^[.#a-z][^{]*\{/m.test(chunk.code)))
  const scored = candidates.map((chunk, index) => ({
    ...chunk,
    sourceOrder: index,
    uiScore: (/<(form|nav|table|button|input|main|section)/.test(chunk.code) ? 10 : 0)
      + (/className=/.test(chunk.code) ? 7 : 0)
      + (/on(Click|Change|Submit)=/.test(chunk.code) ? 6 : 0)
      + (/\.(map|filter)\(/.test(chunk.code) ? 4 : 0)
      + (/md:|sm:|lg:/.test(chunk.code) ? 5 : 0)
      + (/weekSchedule\.map|exportedLogs\.map|reminders\.map|logs\.map|WEEKDAYS\.map/.test(chunk.code) ? 15 : 0)
      + (/selectedEmployeeId|activeTab/.test(chunk.code) ? 8 : 0),
  }))
  const selected = scored.sort((a, b) => b.uiScore - a.uiScore || a.sourceOrder - b.sourceOrder).slice(0, 8).sort((a, b) => a.sourceOrder - b.sourceOrder)

  const codeHeading = document.createElement('header')
  codeHeading.className = 'ui-code-heading'
  codeHeading.innerHTML = `<h3>${selected.length ? 'Connect each picture to the actual UI code' : 'This module has no direct browser markup'}</h3><p>${selected.length ? 'These are the strongest UI-building sections in this module. Expand the line-by-line explanation whenever a brace, tag, or class is unclear.' : 'Its work happens behind the interface. The pictures above show the React screens that consume its results.'}</p>`
  guide.append(codeHeading)

  selected.forEach((chunk, index) => {
    const card = document.createElement('article')
    card.className = 'ui-code-card'
    const cardHeader = document.createElement('header')
    cardHeader.innerHTML = `<span>${index + 1}</span><div><h3>${chunk.title}</h3><small>${chunk.filePath} · Lines ${chunk.startLine}–${chunk.endLine}</small></div>`

    const codeWrap = document.createElement('div')
    codeWrap.className = 'code-wrap'
    const pre = document.createElement('pre')
    const code = document.createElement('code')
    code.textContent = chunk.code
    pre.append(code)
    codeWrap.append(pre)
    addCopyButton(codeWrap, `Copy UI code from ${chunk.filePath}`)

    const explanation = document.createElement('div')
    explanation.className = 'ui-explanation-grid'
    const structure = document.createElement('article')
    const behavior = document.createElement('article')
    const tags = [...new Set([...chunk.code.matchAll(/<([A-Za-z][A-Za-z0-9]*)/g)].map((match) => match[1]))]
    const expressions = [...new Set([...chunk.code.matchAll(/\{([^{}\n]+)\}/g)].map((match) => match[1].trim()).filter(Boolean))].slice(0, 8)
    structure.innerHTML = '<h4>Structure: what contains what</h4>'
    const structureText = document.createElement('p')
    structureText.textContent = tags.length
      ? `This section creates or uses: ${tags.join(', ')}. Indentation and closing tags show which elements are children of another element. A parent controls the layout area offered to its immediate children.`
      : 'This is a CSS rule rather than a JSX element tree. Its selector chooses existing browser elements and the declarations change their presentation.'
    structure.append(structureText)
    if (expressions.length) {
      const dynamic = document.createElement('p')
      dynamic.textContent = `Dynamic JSX expressions in braces: ${expressions.join(' · ')}. React evaluates these during rendering instead of showing the braces as text.`
      structure.append(dynamic)
    }
    behavior.innerHTML = '<h4>Behavior: what the website does</h4>'
    const behaviorText = document.createElement('p')
    behaviorText.textContent = websiteEffectFor(moduleId, chunk)
    behavior.append(behaviorText)
    explanation.append(structure, behavior)

    const classNames = [...new Set([...chunk.code.matchAll(/className=\{?(?:"([^"]*)"|`([^`]*)`)/gs)]
      .flatMap((match) => (match[1] || match[2] || '').split(/\s+/))
      .map((name) => name.trim())
      .filter((name) => name && !/[${}]/.test(name)))]
    const classes = document.createElement('section')
    classes.className = 'ui-class-breakdown'
    classes.innerHTML = `<h4>${classNames.length ? 'Tailwind/CSS class-by-class' : 'Styling relationship'}</h4>`
    if (classNames.length) {
      const list = document.createElement('dl')
      classNames.slice(0, 24).forEach((className) => {
        const row = document.createElement('div')
        const term = document.createElement('dt')
        const meaning = document.createElement('dd')
        term.textContent = className
        meaning.textContent = tailwindMeaning(className)
        row.append(term, meaning)
        list.append(row)
      })
      classes.append(list)
    } else {
      const text = document.createElement('p')
      text.textContent = chunk.explanation
      classes.append(text)
    }

    const responsive = classNames.filter((name) => /^(sm|md|lg|xl):/.test(name))
    if (responsive.length) {
      const note = document.createElement('aside')
      note.className = 'ui-responsive-note'
      note.textContent = `Responsive change: ${responsive.join(', ')} activate only at their named breakpoints. The unprefixed classes describe the mobile-first starting layout.`
      classes.append(note)
    }

    const details = document.createElement('details')
    details.className = 'ui-line-details'
    const summary = document.createElement('summary')
    summary.textContent = 'Explain every line in this UI section'
    const list = document.createElement('ol')
    chunk.lineDetails?.forEach((line) => {
      const item = document.createElement('li')
      const lineCode = document.createElement('code')
      const lineText = document.createElement('p')
      lineCode.textContent = `Line ${line.line}: ${line.code}`
      lineText.textContent = line.explanation
      item.append(lineCode, lineText)
      list.append(item)
    })
    details.append(summary, list)

    card.append(cardHeader, codeWrap, explanation, classes, details)
    guide.append(card)
  })
  panel.replaceChildren(guide)
}

function setupGuideAssistant() {
  const panel = document.querySelector('[data-guide-assistant]')
  const toggle = document.querySelector('[data-guide-assistant-toggle]')
  const close = document.querySelector('[data-guide-assistant-close]')
  const form = document.querySelector('[data-guide-assistant-form]')
  const input = document.querySelector('[data-guide-assistant-input]')
  const answer = document.querySelector('[data-guide-assistant-answer]')
  const contextLabel = document.querySelector('[data-guide-assistant-context]')
  if (!panel || !toggle || !answer || !window.AQLER_SOURCE_GUIDE) return

  let currentContext = null
  const entries = []
  const seenVariables = new Set()
  const seenSyntax = new Set()

  Object.entries(window.AQLER_SOURCE_GUIDE).forEach(([moduleId, files]) => {
    files.forEach((file) => {
      file.chunks.forEach((chunk, chunkIndex) => {
        const location = { moduleId, filePath: file.path, chunkIndex, chunk }
        entries.push({
          kind: 'code cell',
          title: chunk.title,
          body: chunk.plainExplanation,
          extra: `${chunk.timing} ${chunk.explanation}`,
          searchable: `${chunk.title} ${chunk.code} ${chunk.plainExplanation} ${chunk.explanation}`,
          ...location,
        })

        chunk.variables?.forEach((variable) => {
          const key = `${moduleId}|${file.path}|${variable.name}|${variable.meaning}`
          if (seenVariables.has(key)) return
          seenVariables.add(key)
          entries.push({
            kind: 'variable',
            title: variable.name,
            body: variable.meaning,
            extra: `Type: ${variable.type}. Example: ${variable.example}`,
            searchable: `${variable.name} ${variable.type} ${variable.meaning} ${variable.example} ${chunk.title} ${chunk.code}`,
            ...location,
          })
        })

        chunk.syntax?.forEach((note) => {
          const key = `${note.term}|${note.explanation}`
          if (seenSyntax.has(key)) return
          seenSyntax.add(key)
          entries.push({
            kind: 'syntax',
            title: note.term,
            body: note.explanation,
            extra: `Found in ${chunk.title}.`,
            searchable: `${note.term} ${note.explanation} ${chunk.title} ${chunk.code}`,
            ...location,
          })
        })

        chunk.lineDetails?.forEach((line) => {
          entries.push({
            kind: 'source line',
            title: `Line ${line.line}: ${line.code}`,
            body: line.explanation,
            extra: `Part of ${chunk.title}.`,
            searchable: `${line.code} ${line.explanation} ${chunk.title} ${chunk.plainExplanation}`,
            ...location,
          })
        })
      })
    })
  })

  const openPanel = () => {
    panel.hidden = false
    toggle.setAttribute('aria-expanded', 'true')
  }

  const closePanel = () => {
    panel.hidden = true
    toggle.setAttribute('aria-expanded', 'false')
  }

  const appendParagraph = (parent, text) => {
    const paragraph = document.createElement('p')
    paragraph.textContent = text
    parent.append(paragraph)
  }

  const addAnswerSection = (title, text, className = '') => {
    const section = document.createElement('section')
    section.className = `assistant-detail-section ${className}`.trim()
    const heading = document.createElement('h4')
    heading.textContent = title
    section.append(heading)
    if (text) appendParagraph(section, text)
    answer.append(section)
    return section
  }

  const addCodeToAnswer = (title, codeText) => {
    const section = addAnswerSection(title)
    const pre = document.createElement('pre')
    const code = document.createElement('code')
    code.textContent = codeText
    pre.append(code)
    section.append(pre)
    return section
  }

  const renderSurroundingContext = () => {
    const files = window.AQLER_SOURCE_GUIDE?.[currentContext.moduleId] || []
    const file = files.find((candidate) => candidate.path === currentContext.filePath)
    const index = Number.isInteger(currentContext.chunkIndex)
      ? currentContext.chunkIndex
      : file?.chunks.indexOf(currentContext.chunk)
    const section = addAnswerSection('How this cell fits into the surrounding task')
    const position = document.createElement('p')
    position.textContent = `Learning chapter: ${currentContext.chunk.chapter}. Execution group: ${currentContext.chunk.workflow}.`
    section.append(position)
    if (!file || index < 0) return

    const list = document.createElement('ol')
    ;[
      ['Immediately before', file.chunks[index - 1]],
      ['This cell', file.chunks[index]],
      ['Immediately after', file.chunks[index + 1]],
    ].forEach(([label, neighboringChunk]) => {
      if (!neighboringChunk) return
      const item = document.createElement('li')
      const strong = document.createElement('strong')
      const text = document.createElement('p')
      strong.textContent = `${label}: ${neighboringChunk.title}`
      text.textContent = neighboringChunk.plainExplanation
      item.append(strong, text)
      list.append(item)
    })
    section.append(list)
  }

  const renderVariables = (chunk) => {
    const section = addAnswerSection('Names and values used here')
    if (!chunk.variables?.length) {
      appendParagraph(section, 'This cell does not create a named variable. The line-by-line explanation below describes the values and expressions it uses.')
      return
    }
    const grid = document.createElement('div')
    grid.className = 'assistant-variable-list'
    chunk.variables.forEach((variable) => {
      const card = document.createElement('article')
      const name = document.createElement('code')
      const type = document.createElement('small')
      const meaning = document.createElement('p')
      const example = document.createElement('span')
      name.textContent = variable.name
      type.textContent = variable.type
      meaning.textContent = variable.meaning
      example.textContent = `Example value or use: ${variable.example}`
      card.append(name, type, meaning, example)
      grid.append(card)
    })
    section.append(grid)
  }

  const renderSyntax = (chunk) => {
    const section = addAnswerSection('Syntax translated into ordinary language')
    if (!chunk.syntax?.length) {
      appendParagraph(section, chunk.explanation)
      return
    }
    const list = document.createElement('dl')
    chunk.syntax.forEach((note) => {
      const row = document.createElement('div')
      const term = document.createElement('dt')
      const meaning = document.createElement('dd')
      term.textContent = note.term
      meaning.textContent = note.explanation
      row.append(term, meaning)
      list.append(row)
    })
    section.append(list)
  }

  const renderSteps = (chunk) => {
    const section = addAnswerSection('What JavaScript or SQL does, one line at a time')
    const list = document.createElement('ol')
    list.className = 'assistant-line-list'
    chunk.lineDetails?.forEach((line) => {
      const item = document.createElement('li')
      const code = document.createElement('code')
      const explanation = document.createElement('p')
      code.textContent = `Line ${line.line}: ${line.code}`
      explanation.textContent = line.explanation
      item.append(code, explanation)
      list.append(item)
    })
    section.append(list)
  }

  const renderBeginnerNotes = (chunk) => {
    const section = addAnswerSection('Beginner explanation and concrete examples')
    appendParagraph(section, chunk.plainExplanation)
    if (!chunk.beginnerNotes?.length) {
      appendParagraph(section, 'Read the code as one small stage in the larger job described above. The line-by-line section shows exactly how each expression contributes.')
      return
    }
    chunk.beginnerNotes.forEach((note) => {
      const card = document.createElement('article')
      const heading = document.createElement('strong')
      const explanation = document.createElement('p')
      const example = document.createElement('pre')
      heading.textContent = note.title
      explanation.textContent = note.explanation
      example.textContent = note.example
      card.append(heading, explanation, example)
      section.append(card)
    })
  }

  const showContextAnswer = (kind = 'full') => {
    answer.replaceChildren()
    if (!currentContext) {
      appendParagraph(answer, 'Select ? Ask beside a code cell first, or search for a variable, function, or syntax name below.')
      input?.focus()
      return
    }

    const { chunk } = currentContext
    const heading = document.createElement('h3')
    heading.textContent = chunk.title
    answer.append(heading)

    if (kind === 'purpose') addAnswerSection('Why this code exists', chunk.plainExplanation)
    if (kind === 'timing') addAnswerSection('When it runs—and when it does not', chunk.timing)
    if (kind === 'website') addAnswerSection('What changes on the website', websiteEffectFor(currentContext.moduleId, chunk), 'website-effect')
    if (kind === 'names') renderVariables(chunk)
    if (kind === 'syntax') renderSyntax(chunk)
    if (kind === 'steps') renderSteps(chunk)
    if (kind === 'beginner') renderBeginnerNotes(chunk)

    if (kind === 'full') {
      addAnswerSection('The short answer: why this code exists', chunk.plainExplanation)
      renderSurroundingContext()
      addCodeToAnswer('The exact code being explained', chunk.code)
      addAnswerSection('What the person using the website experiences', websiteEffectFor(currentContext.moduleId, chunk), 'website-effect')
      addAnswerSection('When this code runs', chunk.timing)

      if (chunk.contract) {
        const contract = addAnswerSection('Input → work → result')
        const list = document.createElement('ol')
        ;[
          ['Receives', chunk.contract.input],
          ['Does', chunk.contract.work],
          ['Returns or changes', chunk.contract.output],
        ].forEach(([label, value]) => {
          const item = document.createElement('li')
          const strong = document.createElement('strong')
          strong.textContent = `${label}: `
          item.append(strong, document.createTextNode(value))
          list.append(item)
        })
        contract.append(list)
      }

      renderVariables(chunk)
      renderSteps(chunk)
      renderSyntax(chunk)

      if (chunk.changes) {
        const changes = addAnswerSection('Before → action → after')
        appendParagraph(changes, `Before: ${chunk.changes.before}`)
        appendParagraph(changes, `Action: ${chunk.changes.action}`)
        appendParagraph(changes, `After: ${chunk.changes.after}`)
      }

      renderBeginnerNotes(chunk)
      addAnswerSection('Read the complete instruction aloud', chunk.readAloud)

      if (chunk.comparison?.length) {
        const comparison = addAnswerSection('Similar ideas that should not be mixed up')
        const list = document.createElement('ul')
        chunk.comparison.forEach(([name, meaning, example]) => {
          const item = document.createElement('li')
          item.textContent = `${name}: ${meaning}. Example: ${example}`
          list.append(item)
        })
        comparison.append(list)
      }

      if (chunk.glossary?.length) {
        const glossary = addAnswerSection('Terms used in this code')
        const list = document.createElement('dl')
        chunk.glossary.forEach((item) => {
          const row = document.createElement('div')
          const term = document.createElement('dt')
          const definition = document.createElement('dd')
          term.textContent = item.term
          definition.textContent = item.definition
          row.append(term, definition)
          list.append(row)
        })
        glossary.append(list)
      }

      if (chunk.exercise) {
        const practice = addAnswerSection('Check whether you understood it')
        appendParagraph(practice, chunk.exercise.question)
        const details = document.createElement('details')
        const summary = document.createElement('summary')
        const response = document.createElement('p')
        summary.textContent = 'Reveal the answer'
        response.textContent = chunk.exercise.answer
        details.append(summary, response)
        practice.append(details)
      }
    }
  }

  const normalizedWords = (value) => value
    .toLowerCase()
    .replace(/[^a-z0-9_.$]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !['what', 'does', 'this', 'that', 'the', 'and', 'for', 'how', 'why', 'when', 'where', 'code', 'mean', 'means', 'explain'].includes(word))

  const searchGuide = (question) => {
    const normalizedQuestion = question.trim().toLowerCase()
    const words = normalizedWords(question)
    const ranked = entries.map((entry) => {
      const title = entry.title.toLowerCase()
      const searchable = entry.searchable.toLowerCase()
      let score = 0
      if (normalizedQuestion.includes(title)) score += entry.kind === 'variable' ? 50 : 22
      words.forEach((word) => {
        if (title === word) score += 30
        else if (title.includes(word)) score += 12
        if (searchable.includes(word)) score += 3
      })
      if (currentContext && entry.moduleId === currentContext.moduleId) score += 2
      if (currentContext && entry.filePath === currentContext.filePath) score += 2
      if (currentContext && entry.chunk === currentContext.chunk) score += 24
      return { ...entry, score }
    }).filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)

    const results = []
    const resultKeys = new Set()
    ranked.forEach((entry) => {
      const key = `${entry.kind}|${entry.title}|${entry.body}`
      if (resultKeys.has(key) || results.length >= 4) return
      resultKeys.add(key)
      results.push(entry)
    })
    return results
  }

  const openSource = (entry) => {
    window.location.hash = entry.moduleId
    window.setTimeout(() => {
      const section = document.getElementById(entry.moduleId)
      section?.querySelector('[data-panel$="-code"]')?.click()
      section?.querySelector('.source-mode-controls button:nth-child(2)')?.click()
      const cell = [...(section?.querySelectorAll('.notebook-cell') || [])]
        .find((candidate) => candidate.dataset.bookmarkId === `${entry.moduleId}|${entry.filePath}|${entry.chunkIndex}`)
      if (!cell) return
      cell.closest('.source-file').open = true
      cell.hidden = false
      cell.open = true
      closePanel()
      window.setTimeout(() => cell.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
    }, 80)
  }

  const showSearchResults = (question) => {
    answer.replaceChildren()
    const results = searchGuide(question)
    const heading = document.createElement('h3')
    heading.textContent = results.length ? `Best guide answers for “${question}”` : 'No close explanation found'
    answer.append(heading)

    if (!results.length) {
      appendParagraph(answer, 'Try the exact name you see in the code, such as activeTab, useEffect, map, auth.uid, baseline, or setActiveTab.')
      return
    }

    results.forEach((result) => {
      const card = document.createElement('article')
      const header = document.createElement('header')
      const title = document.createElement('strong')
      const kind = document.createElement('span')
      const body = document.createElement('p')
      const extra = document.createElement('small')
      const actions = document.createElement('div')
      const explain = document.createElement('button')
      const open = document.createElement('button')
      title.textContent = result.title
      kind.textContent = result.kind
      body.textContent = result.body
      extra.textContent = `${result.extra} — ${result.filePath}`
      actions.className = 'assistant-result-actions'
      explain.type = 'button'
      explain.textContent = 'Show full explanation'
      explain.addEventListener('click', () => {
        currentContext = { moduleId: result.moduleId, filePath: result.filePath, chunkIndex: result.chunkIndex, chunk: result.chunk }
        contextLabel.querySelector('strong').textContent = result.chunk.title
        contextLabel.querySelector('span').textContent = `${result.filePath} · Lines ${result.chunk.startLine}–${result.chunk.endLine}`
        showContextAnswer('full')
      })
      open.type = 'button'
      open.textContent = 'Open this code cell'
      open.addEventListener('click', () => openSource(result))
      actions.append(explain, open)
      header.append(title, kind)
      card.append(header, body, extra, actions)
      answer.append(card)
    })
  }

  toggle.addEventListener('click', () => panel.hidden ? openPanel() : closePanel())
  close?.addEventListener('click', closePanel)
  form?.addEventListener('submit', (event) => {
    event.preventDefault()
    const question = input?.value.trim()
    if (question) showSearchResults(question)
  })
  document.querySelectorAll('[data-assistant-question]').forEach((button) => {
    button.addEventListener('click', () => showContextAnswer(button.dataset.assistantQuestion))
  })
  document.addEventListener('aqler-guide-ask-context', (event) => {
    currentContext = event.detail
    contextLabel.querySelector('strong').textContent = event.detail.chunk.title
    contextLabel.querySelector('span').textContent = `${event.detail.filePath} · Lines ${event.detail.chunk.startLine}–${event.detail.chunk.endLine}`
    openPanel()
    showContextAnswer('full')
  })
}

document.addEventListener('DOMContentLoaded', () => {
  const sourceMeta = window.AQLER_SOURCE_GUIDE_META
  const sourceFreshness = document.querySelector('[data-source-freshness]')
  if (sourceFreshness && sourceMeta) {
    sourceFreshness.innerHTML = `<strong>Embedded source snapshot ${sourceMeta.sourceHash}</strong><span>${sourceMeta.moduleCount} modules · ${sourceMeta.fileCount} module-file entries · ${sourceMeta.chunkCount} cells · ${sourceMeta.lineCount} source lines</span><code>npm run guide:check</code><span>verifies that this snapshot still matches the current files.</span>`
  }

  const bookmarkToggle = document.querySelector('[data-bookmark-toggle]')
  const bookmarkDrawer = document.querySelector('[data-bookmark-drawer]')
  const bookmarkList = document.querySelector('[data-bookmark-list]')
  const bookmarkCount = document.querySelector('[data-bookmark-count]')

  const openBookmark = (bookmark) => {
    if (window.location.hash !== `#${bookmark.moduleId}`) window.location.hash = bookmark.moduleId
    bookmarkDrawer.hidden = true
    bookmarkToggle?.setAttribute('aria-expanded', 'false')
    window.setTimeout(() => {
      const section = document.getElementById(bookmark.moduleId)
      if (bookmark.kind === 'function') {
        section?.querySelector('[data-panel$="-functions"]')?.click()
        const functionCard = [...(section?.querySelectorAll('.function-story') || [])]
          .find((candidate) => candidate.dataset.functionBookmarkId === bookmark.id)
        functionCard?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
      section?.querySelector('[data-panel$="-code"]')?.click()
      section?.querySelector('.source-mode-controls button:nth-child(2)')?.click()
      const cell = [...(section?.querySelectorAll('.notebook-cell') || [])]
        .find((candidate) => candidate.dataset.bookmarkId === bookmark.id)
      if (!cell) return
      const file = cell.closest('.source-file')
      if (file) file.open = true
      cell.hidden = false
      cell.open = true
      window.setTimeout(() => cell.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
    }, 80)
  }

  const renderBookmarks = () => {
    if (!bookmarkList) return
    const bookmarks = readBookmarks()
    if (bookmarkCount) bookmarkCount.textContent = String(bookmarks.length)
    bookmarkList.replaceChildren()

    if (!bookmarks.length) {
      const empty = document.createElement('p')
      empty.className = 'bookmark-empty'
      empty.textContent = 'No bookmarks yet. Select ☆ beside any code-cell title to save it here.'
      bookmarkList.append(empty)
    }

    bookmarks.forEach((bookmark) => {
      const item = document.createElement('article')
      const open = document.createElement('button')
      const remove = document.createElement('button')
      open.type = 'button'
      open.className = 'bookmark-open'
      open.innerHTML = `<strong>${bookmark.title}</strong><span>${bookmark.moduleId} · ${bookmark.filePath} · ${bookmark.range}</span>`
      open.addEventListener('click', () => openBookmark(bookmark))
      remove.type = 'button'
      remove.className = 'bookmark-remove'
      remove.textContent = 'Remove'
      remove.addEventListener('click', () => {
        writeBookmarks(readBookmarks().filter((item) => item.id !== bookmark.id))
      })
      item.append(open, remove)
      bookmarkList.append(item)
    })
  }

  bookmarkToggle?.addEventListener('click', () => {
    const willOpen = bookmarkDrawer.hidden
    bookmarkDrawer.hidden = !willOpen
    bookmarkToggle.setAttribute('aria-expanded', String(willOpen))
  })
  document.querySelector('[data-close-bookmarks]')?.addEventListener('click', () => {
    bookmarkDrawer.hidden = true
    bookmarkToggle?.setAttribute('aria-expanded', 'false')
  })
  document.querySelector('[data-clear-bookmarks]')?.addEventListener('click', () => writeBookmarks([]))
  document.addEventListener('aqler-bookmarks-changed', renderBookmarks)
  renderBookmarks()

  let preferredModuleView = 'overall'
  try {
    preferredModuleView = sessionStorage.getItem('aqler-guide-reading-level') || 'overall'
  } catch {
    // The guide still works when browser storage is unavailable.
  }

  if (!['overall', 'functions', 'flow', 'ui', 'code', 'logic'].includes(preferredModuleView)) {
    preferredModuleView = 'overall'
  }

  document.querySelectorAll('.module-section').forEach((section) => {
    const tabList = section.querySelector('.module-tabs')
    const codeTab = [...tabList.querySelectorAll('.module-tab')]
      .find((tab) => tab.dataset.panel.endsWith('-code'))
    const codePanel = section.querySelector('[id$="-code"]')
    const functionTab = document.createElement('button')
    const functionPanel = document.createElement('div')
    const flowTab = document.createElement('button')
    const flowPanel = document.createElement('div')
    const uiTab = document.createElement('button')
    const uiPanel = document.createElement('div')
    functionTab.type = 'button'
    functionTab.className = 'module-tab'
    functionTab.setAttribute('role', 'tab')
    functionTab.setAttribute('aria-selected', 'false')
    functionTab.tabIndex = -1
    functionTab.dataset.panel = `${section.id}-functions`
    functionTab.textContent = 'Whole functions'
    functionPanel.className = 'module-panel'
    functionPanel.id = `${section.id}-functions`
    functionPanel.setAttribute('role', 'tabpanel')
    functionPanel.hidden = true
    flowTab.type = 'button'
    flowTab.className = 'module-tab'
    flowTab.setAttribute('role', 'tab')
    flowTab.setAttribute('aria-selected', 'false')
    flowTab.tabIndex = -1
    flowTab.dataset.panel = `${section.id}-flow`
    flowTab.textContent = 'Guided code flow'
    flowPanel.className = 'module-panel'
    flowPanel.id = `${section.id}-flow`
    flowPanel.setAttribute('role', 'tabpanel')
    flowPanel.hidden = true
    uiTab.type = 'button'
    uiTab.className = 'module-tab'
    uiTab.setAttribute('role', 'tab')
    uiTab.setAttribute('aria-selected', 'false')
    uiTab.tabIndex = -1
    uiTab.dataset.panel = `${section.id}-ui`
    uiTab.textContent = 'UI, JSX & CSS'
    uiPanel.className = 'module-panel'
    uiPanel.id = `${section.id}-ui`
    uiPanel.setAttribute('role', 'tabpanel')
    uiPanel.hidden = true
    codeTab?.before(functionTab, flowTab, uiTab)
    codePanel?.before(functionPanel, flowPanel, uiPanel)
  })

  setupGuideAssistant()

  document.querySelectorAll('.code-wrap').forEach((wrapper) => {
    addCopyButton(wrapper)
  })

  document.querySelectorAll('.module-tabs').forEach((tabList) => {
    const module = tabList.closest('.module-section')
    const tabs = [...tabList.querySelectorAll('.module-tab')]

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((candidate) => {
          const selected = candidate === tab
          candidate.setAttribute('aria-selected', String(selected))
          candidate.tabIndex = selected ? 0 : -1
        })

        module.querySelectorAll('.module-panel').forEach((panel) => {
          panel.hidden = panel.id !== tab.dataset.panel
        })

        preferredModuleView = tab.dataset.panel.split('-').at(-1)
        try {
          sessionStorage.setItem('aqler-guide-reading-level', preferredModuleView)
        } catch {
          // The selected level only needs to persist for the current page visit.
        }

        document.querySelectorAll('[data-global-view]').forEach((button) => {
          const selected = button.dataset.globalView === preferredModuleView
          button.classList.toggle('current', selected)
          button.setAttribute('aria-pressed', String(selected))
        })
      })
    })

    tabList.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return

      const current = tabs.indexOf(document.activeElement)
      let next = current
      if (event.key === 'Home') next = 0
      if (event.key === 'End') next = tabs.length - 1
      if (event.key === 'ArrowRight') next = (current + 1) % tabs.length
      if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length

      event.preventDefault()
      tabs[next].focus()
      tabs[next].click()
    })
  })

  const lessons = {
    startup: {
      before: 'Know that a React app begins from one HTML root element.',
      outcome: 'Explain how the app restores a session and protects a route.',
      model: 'Reception desk: identify the visitor, then direct them to the correct room.',
      mistake: 'The route check hides a page, but it does not replace database RLS.',
      question: 'What exact state change causes App to choose different routes after login?',
      answer: 'The Supabase auth listener calls setSession(session). React renders App again, and the route expressions are evaluated using the new session.',
      inputs: 'Browser URL, stored Supabase session, and Vite environment variables.',
      work: 'Mount React, create the client, restore auth, and evaluate routes.',
      outputs: 'Home, Admin, Login, Register, redirect, or loading screen.',
      next: 'The selected page receives session as a prop.',
    },
    auth: {
      before: 'Understand that input state stores what the user has typed.',
      outcome: 'Trace a credential from an input through Supabase Auth to App.',
      model: 'A form is a draft object; the handler validates and submits the draft.',
      mistake: 'A successful sign-up message is currently stored in a variable named error. It works visually, but separate error and success state would be clearer.',
      question: 'Why does registration put full_name inside options.data?',
      answer: 'Supabase stores it as user metadata. The database trigger later reads raw_user_meta_data and copies full_name into public.profiles.',
      inputs: 'Full name, email, password, and confirmation typed by the user.',
      work: 'Validate fields and call Supabase Auth sign-in or sign-up.',
      outputs: 'An auth error, confirmation message, or authenticated session.',
      next: 'App’s auth listener receives the new session.',
    },
    navbar: {
      before: 'Know that props are values and functions passed from a parent.',
      outcome: 'Explain how one Navbar behaves differently for employees and admins.',
      model: 'Navbar is a display component controlled by instructions from its parent.',
      mistake: 'Hiding the Admin link is not authorization. A user can type a URL manually, so App and RLS still need checks.',
      question: 'Why is onClick={onSignOut} not written as onClick={onSignOut()}?',
      answer: 'React needs the function itself so it can call it later. Adding parentheses would call it immediately while the Navbar renders.',
      inputs: 'user, isAdmin, and onSignOut props from the parent page.',
      work: 'Conditionally render links, identity, role, and responsive layout.',
      outputs: 'Navigation clicks or a call to the supplied sign-out function.',
      next: 'React Router changes pages; Supabase sign-out changes App session.',
    },
    timekeeping: {
      before: 'Review state, refs, async/await, and database inserts.',
      outcome: 'Trace Time In and Time Out through one work-session row in logs.',
      model: 'One logs row is one time card: time_out null means open; a time_out timestamp means completed.',
      mistake: 'A React state guard alone is not a database-wide guarantee. Two tabs can still race, so the database should also enforce one open logs row per employee.',
      question: 'Why does Time Out update the active row instead of inserting another row?',
      answer: 'Time In and Time Out describe the same work session. Keeping them in one row gives the admin one table row with shift date, both timestamps, duration, and status.',
      inputs: 'Signed-in user, current time, loaded logs, and current active session.',
      work: 'Guard clicks, insert an open logs row, update that same row at Time Out, and calculate display duration.',
      outputs: 'One updated session row, working controls, work-log cards, and an alert message.',
      next: 'WorkLog receives the updated logs array.',
    },
    worklog: {
      before: 'Know that slice returns part of an array and map renders each item.',
      outcome: 'Distinguish client-side display limiting from database pagination.',
      model: 'All books are already on the desk; limit decides how many covers are visible.',
      mistake: 'Show more does not fetch another page. Home already downloaded every employee log.',
      question: 'What happens to the original logs array when visibleLogs uses slice(0, limit)?',
      answer: 'Nothing. slice returns a new array containing the selected positions and leaves logs unchanged.',
      inputs: 'The employee logs array passed by Home.',
      work: 'Slice visible rows, detect a null Time Out, and calculate elapsed hours/minutes for completed rows.',
      outputs: 'Rendered log cards and Show more/Show less controls.',
      next: 'No next module; this is the employee-facing display result.',
    },
    adminlogs: {
      before: 'Review useEffect dependencies, debounce timers, database range/count, loops, map, and browser Blob APIs.',
      outcome: 'Explain why the table is paginated on the server while export intentionally uses its own all-results query.',
      model: 'The screen borrows one 20-row page; Export separately collects every matching row in boxes of 1,000.',
      mistake: 'Exporting the current logs state would export only the visible page. The separate batched query is necessary for a complete file.',
      question: 'What causes the administrator log SQL query to run again?',
      answer: 'The fetch effect depends on page, debouncedSearch, and refreshNumber. Previous/Next changes page, paused typing changes debouncedSearch, and Refresh increments refreshNumber.',
      inputs: 'Admin session, current page, settled search text, and refresh counter.',
      work: 'Filter and paginate in Postgres, render one page, or independently fetch all matches and construct CSV.',
      outputs: 'A 20-row searchable table with exact page count or a complete downloaded CSV file.',
      next: 'The browser download system receives the temporary Blob URL.',
    },
    reminders: {
      before: 'Know object spread, array filter, form submit, and insert/delete queries.',
      outcome: 'Explain how an admin creates a recurring rule and removes it.',
      model: 'The Admin page writes calendar instructions; it is not the alarm clock that sends mail.',
      mistake: 'Inserting a reminder does not schedule code execution by itself. The Edge Function still needs a recurring Cron caller.',
      question: 'Why does cancelling update both Supabase and React state?',
      answer: 'Supabase deletion makes the change permanent. Filtering React state removes the row immediately from the current screen without reloading all reminders.',
      inputs: 'Employee, weekdays, time, subject, message, and admin user ID.',
      work: 'Validate and insert an active schedule or delete a cancelled one.',
      outputs: 'An email_reminders row and an updated active-schedule list.',
      next: 'Cron and the Edge Function later read the schedule.',
    },
    processor: {
      before: 'Review HTTP requests, loops, environment secrets, dates, and conditional continue.',
      outcome: 'Explain how a due reminder is claimed once, sent, and recorded.',
      model: 'Cron rings the bell; the worker checks the calendar, claims a task, then delivers it.',
      mistake: 'A deployed function that is never invoked does nothing. Also, service-role and Brevo keys must never be moved into React.',
      question: 'Why update last_sent_on before calling Brevo?',
      answer: 'It claims the reminder so overlapping function runs cannot both send it. On failure, the code clears last_sent_on so a later run can retry.',
      inputs: 'Cron POST request, environment secrets, and active reminder rows.',
      work: 'Calculate local time, skip non-due rows, claim, and call Brevo.',
      outputs: 'Email request plus sent_at or error database updates.',
      next: 'Brevo delivers mail; the next Cron run evaluates schedules again.',
    },
    shifts: {
      before: 'Review arrays, map, find, controlled inputs, useEffect, useCallback, upsert, and RLS.',
      outcome: 'Explain how one page edits a recurring weekly baseline, overlays exact-date exceptions, and carries overnight status from checkbox to database to +1 day display.',
      model: 'The baseline is the normal weekly template; an override is a sticky note placed on one calendar date and read first. Overnight is a saved yes/no property on either kind of working row.',
      mistake: 'The tables do not merge automatically, and overnight should not be guessed merely from the clock order. React loads both, applies override-first priority, and copies the saved is_overnight value.',
      question: 'How does overrideOvernight reach Supabase?',
      answer: 'Apply custom times copies overrideOvernight into day.overnight for selected dates. Save this week maps that day to a row and writes Boolean(day.overnight) into is_overnight.',
      inputs: 'Signed-in session, selected employee, displayed week, recurring weekday rows, and exact-date override rows.',
      work: 'Load both tables, build seven effective dates, edit bulk or individual controls, validate times, save explicit overnight/day-off/note values, and delete rows that mean baseline restoration.',
      outputs: 'An admin editor or employee read-only week, plus durable rows in shifts and shift_overrides.',
      next: 'The rendered employee week uses the override-first result; Supabase RLS remains the real authorization boundary.',
    },
    database: {
      before: 'Know the difference between tables, rows, foreign keys, constraints, and policies.',
      outcome: 'Explain how GRANT, RLS, JWT roles, and constraints protect different things.',
      model: 'GRANT opens the building, RLS chooses allowed rooms, and constraints reject invalid objects inside a room.',
      mistake: 'React filters are never privacy controls. Rows must be restricted before Supabase returns them.',
      question: 'Why can both an employee-own-row policy and an admin-all-rows policy exist for SELECT?',
      answer: 'They are permissive policies and combine with OR. An employee can pass ownership; an administrator can pass the JWT role condition.',
      inputs: 'SQL migration order, authenticated user ID, JWT claims, and row values.',
      work: 'Store rows, enforce relationships/constraints, and evaluate RLS.',
      outputs: 'Permitted query results or a database error.',
      next: 'Supabase returns the result to React or the Edge Function.',
    },
    styling: {
      before: 'Know that files only affect the application when they are imported or routed.',
      outcome: 'Identify which global stylesheet currently affects the application.',
      model: 'A file is building material; imports and routes are what connect it to the building.',
      mistake: 'A CSS file does not affect the interface merely because it exists in src. Some module must import it.',
      question: 'Why does index.css affect the app while App.css currently does not?',
      answer: 'main.jsx imports index.css. The inspected startup path does not import App.css.',
      inputs: 'CSS files, Tailwind content paths, PostCSS plugins, and JSX class names.',
      work: 'Scan utilities, process CSS, and bundle imported styles.',
      outputs: 'Global theme values, base rules, and generated utility CSS.',
      next: 'The browser applies the bundled styles to rendered JSX.',
    },
  }

  const learningLabs = {
    startup: {
      trace: [['session', 'null', '{ user: { id: "u1" } }', 'The auth callback receives the signed-in session.'], ['loading', 'true', 'false', 'The initial session check has finished.'], ['route', '/login', '/', 'App evaluates its JSX again and chooses the protected page.']],
      state: ['Browser loads index.html', 'main.jsx mounts <App />', 'getSession resolves', 'setSession + setLoading', 'React renders the matching route'],
      result: `{ data: { session: { user: { id: "u1", email: "employee@example.com" } } } }`,
      exercises: [['If getSession returns null, which page should App show?', 'Follow the route condition that checks session.', 'It shows Login for protected routes because there is no authenticated session.'], ['Why keep the auth subscription cleanup?', 'Think about what happens if App unmounts and the listener stays registered.', 'Cleanup unsubscribes the listener, preventing duplicate callbacks and leaked subscriptions.']],
    },
    auth: {
      trace: [['email', '""', '"employee@example.com"', 'onChange copies the typed value into state.'], ['loading', 'false', 'true → false', 'Submission disables the form until the Promise settles.'], ['session', 'null', 'authenticated session', 'Supabase Auth notifies App after a successful login.']],
      state: ['User types into controlled inputs', 'Submit handler prevents reload', 'Supabase Auth receives credentials', 'Promise resolves', 'App auth listener changes the route'],
      result: `{ data: { user: { id: "u1" }, session: { access_token: "…" } }, error: null }`,
      exercises: [['What does onChange run with?', 'React passes an event object.', 'It receives the input event; event.target.value is the latest text.'], ['Why is await allowed in the submit handler?', 'Look for the keyword before the function.', 'The handler is async, so await may pause that handler until the Auth Promise settles.']],
    },
    navbar: {
      trace: [['isAdmin', 'false', 'true', 'The conditional Admin link and role label become visible.'], ['user.email', 'undefined', '"admin@example.com"', 'The identity area can render the email and first-letter avatar.'], ['location', '"/"', '"/shifts"', 'Clicking a Link asks React Router to display another page.']],
      state: ['Parent renders Navbar with props', 'Navbar evaluates isAdmin', 'Links and identity are produced', 'User clicks a Link or Sign out', 'Parent/router handles the action'],
      result: `{ user: { email: "admin@example.com" }, isAdmin: true, onSignOut: function }`,
      exercises: [['What changes if isAdmin is false?', 'Find JSX guarded by &&.', 'Admin-only links and the Administrator label are omitted.'], ['Why pass onSignOut without parentheses?', 'React needs work to call later.', 'Without parentheses the function is stored as the click handler; parentheses would invoke it during rendering.']],
    },
    timekeeping: {
      trace: [['activeSession', 'null', '{ id: "l1", time_in: "08:00", time_out: null }', 'A successful Time In stores the open logs row.'], ['isProcessingRef.current', 'false', 'true → false', 'The ref immediately prevents overlapping clicks without waiting for a render.'], ['logs', '2 rows', '3 rows', 'Time In prepends one row; Time Out later replaces that same row.']],
      state: ['Click Time In', 'React guard validates current state', 'Supabase inserts one logs row with null time_out', 'Click Time Out updates that row', 'State setters make the buttons and WorkLog render again'],
      result: `[{ "id": "l1", "shift_date": "2026-08-26", "time_in": "2026-08-26T00:00:00Z", "time_out": null }]`,
      exercises: [['Why also filter Time Out by is(time_out, null)?', 'Think about a second request reaching an already-completed row.', 'The update succeeds only while the row is still open, preventing a completed session from being ended twice.'], ['What does await change here?', 'It affects only the current async handler.', 'The handler pauses until Supabase settles, while the browser and React remain responsive.']],
    },
    worklog: {
      trace: [['limit', '5', '10', 'Show more increases how many existing items slice selects.'], ['visibleLogs', 'logs.slice(0, 5)', 'logs.slice(0, 10)', 'A new shorter/longer array is calculated.'], ['logs', 'unchanged', 'unchanged', 'slice never mutates the source array.']],
      state: ['Receive logs prop', 'Calculate visibleLogs with slice', 'map rows into JSX', 'User clicks Show more', 'setLimit causes a new render'],
      result: `logs.length = 24\nlimit = 5\nvisibleLogs.length = 5`,
      exercises: [['Does Show more run a Supabase query?', 'Look for a database call in the click handler.', 'No. It only changes limit and reveals more rows already held in memory.'], ['Why use a key while mapping?', 'React must match old and new list elements.', 'A stable key lets React update the correct rendered row efficiently.']],
    },
    adminlogs: {
      trace: [['search', '""', '"glenda"', 'The controlled field changes immediately.'], ['debouncedSearch', '""', '"glenda" after 400 ms', 'The previous timer is cancelled while typing continues.'], ['logs', 'old 20-row page', 'new matching 20-row page', 'The effect reruns the range/ilike query.'], ['exportedLogs', '[]', 'all matching batches', 'Export retrieves independently of the visible page.']],
      state: ['User types', 'Debounce settles and resets page 1', 'Effect queries admin_work_logs with range and exact count', 'Table rerenders', 'Export click retrieves all matching batches and downloads a Blob'],
      result: `{ "data": [{ "id": "l1", "full_name": "Glenda Cruz", "shift_date": "2026-08-26" }], "count": 53 }`,
      exercises: [['Does each keystroke send a database query?', 'Follow the 400 ms timeout and its cleanup.', 'No. Continuing to type clears the old timer; only a pause updates debouncedSearch and reruns the effect.'], ['Why does export need its own server query?', 'The table logs state contains only a 20-row page.', 'A separate batched query intentionally retrieves every match, not only the visible page.']],
    },
    reminders: {
      trace: [['selectedDays', '[]', '[1,2,3,4,5]', 'Checkbox actions build the recurring weekday array.'], ['schedules', '3 rows', '4 rows', 'A successful insert is added to active UI state.'], ['schedules after cancel', '4 rows', '3 rows', 'The deleted schedule is filtered out locally.']],
      state: ['Admin fills recurring rule', 'Submit validates fields', 'Insert email_reminders row', 'Cron later calls worker', 'Cancel permanently deletes the selected row'],
      result: `{ "status": "active", "days_of_week": [1,2,3,4,5], "reminder_time": "17:00:00", "timezone": "Asia/Manila" }`,
      exercises: [['Does inserting a row send an email immediately?', 'Separate the schedule from the worker.', 'No. The row is an instruction; Cron must invoke the Edge Function when it may be due.'], ['Why remove cancelled rows instead of retaining paused ones?', 'The requested UI shows active schedules only.', 'Deletion keeps the active list and table smaller, though it removes cancellation history.']],
    },
    processor: {
      trace: [['dueNow', 'false', 'true', 'Weekday, local time, status, and last_sent_on all pass.'], ['last_sent_on', 'null', '"2026-08-26"', 'The worker claims today before sending.'], ['sent_at', 'null', 'current UTC timestamp', 'A successful Brevo response is recorded.']],
      state: ['Cron sends POST', 'Function loads active reminders', 'Each row is tested in its timezone', 'Due row is claimed atomically', 'Brevo response is recorded'],
      result: `{ "processed": 3, "sent": 1, "skipped": 2, "failed": 0 }`,
      exercises: [['Why can a POST 200 still send zero emails?', 'HTTP success and business eligibility are different.', 'The function ran successfully, but every schedule may have been skipped as not due.'], ['Why are API keys environment variables?', 'Consider what Vite ships to browsers.', 'Server secrets stay in the Edge Function environment and are not exposed in downloaded frontend code.']],
    },
    shifts: {
      trace: [['selectedEmployeeId', '"u1"', '"u2"', 'The admin changes whose schedule is being edited.'], ['overrideOvernight', 'false', 'true', 'The bulk checkbox records the choice before Apply is pressed.'], ['day.overnight', 'false', 'true', 'Apply copies that choice into each selected date object.'], ['is_overnight', 'false', 'true', 'Save maps the draft property to the database column.'], ['display', '05:00', '05:00 +1 day', 'The read-only card explains that the end belongs to tomorrow.']],
      state: ['Choose employee/week', 'Load shifts + shift_overrides', 'Build seven effective day objects', 'Apply bulk values or edit one date', 'Upsert custom/day-off rows or delete an override to restore baseline'],
      result: `{ "shift_date": "2026-08-28", "start_time": "17:00", "end_time": "05:00", "is_overnight": true, "is_day_off": false }`,
      exercises: [['What happens when no override row exists?', 'Use the sticky-note mental model.', 'The app falls back to the recurring shifts row for that weekday.'], ['Why is is_overnight false for a day off?', 'A day off has no start or end time.', 'Overnight only describes a working shift crossing midnight; forcing false keeps the row internally consistent.']],
    },
    database: {
      trace: [['auth.uid()', '"u1"', '"u1"', 'The JWT identity is compared with each row user_id.'], ['USING result', 'unknown', 'true', 'The existing row may be selected/updated/deleted.'], ['WITH CHECK result', 'unknown', 'false', 'An invalid new row is rejected before storage.']],
      state: ['Client sends query with JWT', 'GRANT permits the operation type', 'RLS evaluates policies per row', 'Constraints validate proposed data', 'Postgres returns rows or an error'],
      result: `employee SELECT → own rows only\nadmin SELECT → all permitted rows\ninvalid end_time → CHECK constraint error`,
      exercises: [['How do two permissive SELECT policies combine?', 'Either policy may permit the row.', 'They combine with OR: ownership OR administrator role can pass.'], ['What is the difference between USING and WITH CHECK?', 'Existing row versus proposed new row.', 'USING filters accessible existing rows; WITH CHECK validates inserted or updated row values.']],
    },
    styling: {
      trace: [['viewport', '360px', '768px+', 'md: utilities begin applying at the medium breakpoint.'], ['class', 'flex-col', 'md:flex-row', 'The same elements change from stacked to horizontal.'], ['imported CSS', 'index.css', 'bundled output', 'Vite processes only styles reachable through imports.']],
      state: ['main.jsx imports index.css', 'PostCSS runs Tailwind', 'Vite discovers JSX class names', 'CSS is bundled', 'Browser applies matching responsive rules'],
      result: `mobile: flex-direction: column\nmd and wider: flex-direction: row`,
      exercises: [['What does md: mean?', 'It is a minimum-width prefix.', 'Apply this utility at Tailwind’s medium breakpoint and wider; the unprefixed class is the mobile default.'], ['Why might App.css have no effect?', 'Find whether it is imported.', 'A stylesheet outside the import graph is not bundled or loaded merely because the file exists.']],
    },
  }

  const progressKey = 'aqler-guide-understood'
  let understood = []
  let updateModuleRail = () => {}
  try {
    understood = JSON.parse(localStorage.getItem(progressKey) || '[]')
  } catch {
    understood = []
  }

  const updateProgress = () => {
    const count = Object.keys(lessons).filter((id) => understood.includes(id)).length
    const total = Object.keys(lessons).length
    const label = document.querySelector('[data-progress-label]')
    const fill = document.querySelector('[data-progress-fill]')
    const track = document.querySelector('.progress-track')
    if (label) label.textContent = `${count} of ${total} modules understood`
    if (fill) fill.style.width = `${(count / total) * 100}%`
    if (track) track.setAttribute('aria-valuenow', String(count))
    updateModuleRail()
  }

  Object.entries(lessons).forEach(([id, lesson]) => {
    const section = document.getElementById(id)
    if (!section) return
    const lab = learningLabs[id]

    const prep = document.createElement('div')
    prep.className = 'learning-prep'
    prep.innerHTML = `
      <article><strong>Before you start</strong><p>${lesson.before}</p></article>
      <article><strong>Learning goal</strong><p>${lesson.outcome}</p></article>
      <article><strong>Mental model</strong><p>${lesson.model}</p></article>
    `
    section.querySelector('.module-tabs').before(prep)

    const overallPanel = section.querySelector('[id$="-overall"]')
    if (overallPanel) {
      const contract = document.createElement('div')
      contract.className = 'module-contract'
      contract.innerHTML = `
        <article><strong>Inputs</strong><p>${lesson.inputs}</p></article>
        <article><strong>Internal work</strong><p>${lesson.work}</p></article>
        <article><strong>Outputs</strong><p>${lesson.outputs}</p></article>
        <article><strong>Hands off to</strong><p>${lesson.next}</p></article>
      `
      overallPanel.prepend(contract)

      if (lab) {
        const learningLab = document.createElement('section')
        learningLab.className = 'guided-learning-lab'
        learningLab.innerHTML = `
          <header><p class="eyebrow">Guided walkthrough</p><h3>Watch values move through this module</h3><p class="muted">Use these concrete values before reading the full source. They show what changes, what causes it, and what the next code receives.</p></header>
          <div class="lab-grid">
            <article class="variable-walkthrough"><h4>Variable walkthrough</h4><div class="trace-table" role="table" aria-label="Variable before and after values">
              ${lab.trace.map(([name, before, after, meaning]) => `<div class="trace-row" role="row"><code>${name}</code><span><small>Before</small>${before}</span><span class="trace-arrow">→</span><span><small>After</small>${after}</span><p>${meaning}</p></div>`).join('')}
            </div></article>
            <article class="state-walkthrough"><h4>State-change path</h4><ol>${lab.state.map((step) => `<li>${step}</li>`).join('')}</ol></article>
          </div>
          <article class="result-example"><h4>Example result</h4><p class="muted">This is a representative value shape, so you can picture what later code reads.</p><div class="code-wrap"><pre><code></code></pre></div></article>
        `
        learningLab.querySelector('.result-example code').textContent = lab.result
        addCopyButton(learningLab.querySelector('.result-example .code-wrap'), `Copy ${id} example result`)
        overallPanel.append(learningLab)
      }
    }

    const wholeFunctionsPanel = section.querySelector('[id$="-functions"]')
    if (wholeFunctionsPanel) renderFunctionGuide(id, wholeFunctionsPanel)

    const guidedFlowPanel = section.querySelector('[id$="-flow"]')
    if (guidedFlowPanel) renderGuidedFlow(id, guidedFlowPanel)

    const uiGuidePanel = section.querySelector('[id$="-ui"]')
    if (uiGuidePanel) renderUiGuide(id, uiGuidePanel)

    const codePanel = section.querySelector('[id$="-code"]')
    if (codePanel) {
      renderCompleteSource(id, codePanel)

      const warning = document.createElement('aside')
      warning.className = 'common-mistake'
      warning.innerHTML = `<strong>Common misunderstanding</strong>${lesson.mistake}`
      codePanel.append(warning)
    }

    const logicPanel = section.querySelector('[id$="-logic"]')
    if (logicPanel) {
      if (lab) {
        const practice = document.createElement('section')
        practice.className = 'practice-lab'
        const practiceHeader = document.createElement('header')
        practiceHeader.innerHTML = '<p class="eyebrow">Practice</p><h3>Try it before revealing the answer</h3>'
        practice.append(practiceHeader)
        lab.exercises.forEach(([question, hint, answer], index) => {
          const exercise = document.createElement('article')
          exercise.innerHTML = `<h4>Exercise ${index + 1}</h4><p>${question}</p><details><summary>Show a hint</summary><p>${hint}</p></details><details><summary>Reveal the answer</summary><p>${answer}</p></details>`
          practice.append(exercise)
        })
        logicPanel.append(practice)
      }

      const check = document.createElement('div')
      check.className = 'knowledge-check'
      check.innerHTML = `
        <h3>Check your understanding</h3>
        <p>${lesson.question}</p>
        <details><summary>Reveal the answer</summary><p>${lesson.answer}</p></details>
        <button class="understood-button" type="button" aria-pressed="${understood.includes(id)}">
          ${understood.includes(id) ? '✓ Understood' : 'Mark this module understood'}
        </button>
      `

      const button = check.querySelector('button')
      button.addEventListener('click', () => {
        if (understood.includes(id)) understood = understood.filter((item) => item !== id)
        else understood = [...understood, id]

        try {
          localStorage.setItem(progressKey, JSON.stringify(understood))
        } catch {
          // The guide still works when browser storage is unavailable.
        }

        const selected = understood.includes(id)
        button.setAttribute('aria-pressed', String(selected))
        button.textContent = selected ? '✓ Understood' : 'Mark this module understood'
        updateProgress()
      })
      logicPanel.append(check)
    }
  })

  const reset = document.querySelector('[data-reset-progress]')
  if (reset) {
    reset.addEventListener('click', () => {
      understood = []
      try {
        localStorage.removeItem(progressKey)
      } catch {
        // Ignore unavailable browser storage.
      }
      document.querySelectorAll('.understood-button').forEach((button) => {
        button.setAttribute('aria-pressed', 'false')
        button.textContent = 'Mark this module understood'
      })
      updateProgress()
    })
  }

  const courseNavigator = document.querySelector('[data-course-navigator]')
  const guideModeButtons = [...document.querySelectorAll('[data-guide-mode]')]
  const moduleNavigator = document.querySelector('[data-module-navigator]')
  const modulePicker = document.querySelector('[data-module-picker]')
  const previousModule = document.querySelector('[data-previous-module]')
  const nextModule = document.querySelector('[data-next-module]')
  const modulePosition = document.querySelector('[data-module-position]')
  const moduleRail = document.querySelector('[data-module-rail]')
  const keyboardHint = document.querySelector('.keyboard-hint')
  const overviewNavigator = document.querySelector('[data-overview-navigator]')
  const overviewPicker = document.querySelector('[data-overview-picker]')
  const previousOverview = document.querySelector('[data-previous-overview]')
  const nextOverview = document.querySelector('[data-next-overview]')
  const overviewPosition = document.querySelector('[data-overview-position]')
  const moduleSections = [...document.querySelectorAll('.module-section')]
  const syntaxHandbook = document.getElementById('syntax-handbook')
  const topLevelChildren = [...document.querySelector('main.shell').children]
  const overviewSections = topLevelChildren.filter((element) =>
    element.matches('.study-order')
      || (element.matches('.lesson:not(.module-section)') && element.id !== 'syntax-handbook')
  )
  overviewSections.forEach((section, index) => {
    if (!section.id) section.id = `foundation-${index + 1}`
    const option = document.createElement('option')
    option.value = section.id
    option.textContent = `${index + 1}. ${section.querySelector('h2')?.textContent || 'Foundation topic'}`
    overviewPicker?.append(option)
  })

  const locationKey = 'aqler-guide-location'
  let savedLocation = {}
  try {
    savedLocation = JSON.parse(localStorage.getItem(locationKey) || '{}')
  } catch {
    savedLocation = {}
  }

  const locationHash = window.location.hash.slice(1)
  const hashModuleIndex = moduleSections.findIndex((section) => section.id === locationHash)
  const savedModuleIndex = moduleSections.findIndex((section) => section.id === savedLocation.moduleId)
  let currentModuleIndex = Math.max(
    0,
    hashModuleIndex >= 0 ? hashModuleIndex : savedModuleIndex,
  )
  const hashOverviewIndex = overviewSections.findIndex((section) => section.id === locationHash)
  const savedOverviewIndex = overviewSections.findIndex((section) => section.id === savedLocation.overviewId)
  let currentOverviewIndex = Math.max(0, hashOverviewIndex >= 0 ? hashOverviewIndex : savedOverviewIndex)
  let currentGuideMode = ['overview', 'syntax', 'modules'].includes(savedLocation.mode)
    ? savedLocation.mode
    : 'modules'

  const selectModuleView = (section, view = preferredModuleView) => {
    const target = [...section.querySelectorAll('.module-tab')]
      .find((tab) => tab.dataset.panel.endsWith(`-${view}`))
    target?.click()
  }

  const endNavigation = document.createElement('nav')
  endNavigation.className = 'module-end-nav'
  endNavigation.setAttribute('aria-label', 'Continue through application modules')
  endNavigation.innerHTML = `
    <button class="button" type="button" data-end-previous>← Previous module</button>
    <span class="module-position" data-end-position></span>
    <button class="button" type="button" data-end-next>Next module →</button>
  `
  const endPrevious = endNavigation.querySelector('[data-end-previous]')
  const endNext = endNavigation.querySelector('[data-end-next]')
  const endPosition = endNavigation.querySelector('[data-end-position]')

  const moveToModule = (nextIndex, { scroll = true } = {}) => {
    if (nextIndex < 0 || nextIndex >= moduleSections.length) return
    currentModuleIndex = nextIndex
    showGuideView('modules', { scroll })
  }

  endPrevious.addEventListener('click', () => moveToModule(currentModuleIndex - 1))
  endNext.addEventListener('click', () => moveToModule(currentModuleIndex + 1))

  const overviewEndNavigation = document.createElement('nav')
  overviewEndNavigation.className = 'module-end-nav'
  overviewEndNavigation.setAttribute('aria-label', 'Continue through foundation topics')
  overviewEndNavigation.innerHTML = `
    <button class="button" type="button" data-overview-end-previous>← Previous topic</button>
    <span class="module-position" data-overview-end-position></span>
    <button class="button" type="button" data-overview-end-next>Next topic →</button>
  `
  const overviewEndPrevious = overviewEndNavigation.querySelector('[data-overview-end-previous]')
  const overviewEndNext = overviewEndNavigation.querySelector('[data-overview-end-next]')
  const overviewEndPosition = overviewEndNavigation.querySelector('[data-overview-end-position]')

  const moveToOverview = (nextIndex, { scroll = true } = {}) => {
    if (nextIndex < 0 || nextIndex >= overviewSections.length) return
    currentOverviewIndex = nextIndex
    showGuideView('overview', { scroll })
  }

  overviewEndPrevious.addEventListener('click', () => moveToOverview(currentOverviewIndex - 1))
  overviewEndNext.addEventListener('click', () => moveToOverview(currentOverviewIndex + 1))

  if (moduleRail) {
    moduleSections.forEach((section, index) => {
      const button = document.createElement('button')
      const label = modulePicker?.options[index]?.textContent || `Module ${index + 1}`
      button.type = 'button'
      button.textContent = String(index + 1)
      button.title = label
      button.setAttribute('aria-label', label)
      button.addEventListener('click', () => moveToModule(index))
      moduleRail.append(button)
    })
  }

  updateModuleRail = () => {
    moduleRail?.querySelectorAll('button').forEach((button, index) => {
      const current = currentGuideMode === 'modules' && index === currentModuleIndex
      button.setAttribute('aria-current', current ? 'step' : 'false')
      button.dataset.understood = String(understood.includes(moduleSections[index]?.id))
    })
  }

  const renderCurrentModule = () => {
    moduleSections.forEach((section, index) => {
      section.hidden = currentGuideMode !== 'modules' || index !== currentModuleIndex
    })

    if (modulePicker) modulePicker.value = moduleSections[currentModuleIndex]?.id || ''
    if (modulePosition) modulePosition.textContent = `${currentModuleIndex + 1} of ${moduleSections.length}`
    if (previousModule) previousModule.disabled = currentModuleIndex === 0
    if (nextModule) nextModule.disabled = currentModuleIndex === moduleSections.length - 1

    const currentSection = moduleSections[currentModuleIndex]
    if (currentGuideMode === 'modules' && currentSection) {
      selectModuleView(currentSection)
      currentSection.append(endNavigation)
    }

    if (endPosition) endPosition.textContent = `Module ${currentModuleIndex + 1} of ${moduleSections.length}`
    endPrevious.disabled = currentModuleIndex === 0
    endNext.disabled = currentModuleIndex === moduleSections.length - 1
    updateModuleRail()

    const currentRailButton = moduleRail?.querySelectorAll('button')[currentModuleIndex]
    if (moduleRail && currentRailButton && moduleRail.scrollWidth > moduleRail.clientWidth) {
      const centeredLeft = currentRailButton.offsetLeft
        - moduleRail.offsetLeft
        - ((moduleRail.clientWidth - currentRailButton.offsetWidth) / 2)
      moduleRail.scrollTo({ left: centeredLeft, behavior: 'smooth' })
    }
  }

  const renderCurrentOverview = () => {
    overviewSections.forEach((section, index) => {
      section.hidden = currentGuideMode !== 'overview' || index !== currentOverviewIndex
    })

    const currentSection = overviewSections[currentOverviewIndex]
    if (overviewPicker) overviewPicker.value = currentSection?.id || ''
    if (overviewPosition) overviewPosition.textContent = `${currentOverviewIndex + 1} of ${overviewSections.length}`
    if (previousOverview) previousOverview.disabled = currentOverviewIndex === 0
    if (nextOverview) nextOverview.disabled = currentOverviewIndex === overviewSections.length - 1
    if (overviewEndPosition) overviewEndPosition.textContent = `Topic ${currentOverviewIndex + 1} of ${overviewSections.length}`
    overviewEndPrevious.disabled = currentOverviewIndex === 0
    overviewEndNext.disabled = currentOverviewIndex === overviewSections.length - 1

    if (currentGuideMode === 'overview' && currentSection) {
      currentSection.append(overviewEndNavigation)
    }
  }

  const showGuideView = (mode, { scroll = true, updateHash = true, historyMode = 'push' } = {}) => {
    currentGuideMode = mode
    if (syntaxHandbook) syntaxHandbook.hidden = mode !== 'syntax'
    if (moduleNavigator) moduleNavigator.hidden = mode !== 'modules'
    if (moduleRail) moduleRail.hidden = mode !== 'modules'
    if (keyboardHint) keyboardHint.hidden = mode !== 'modules'
    if (overviewNavigator) overviewNavigator.hidden = mode !== 'overview'

    guideModeButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.guideMode === mode))
    })

    renderCurrentModule()
    renderCurrentOverview()

    try {
      localStorage.setItem(locationKey, JSON.stringify({
        mode,
        moduleId: moduleSections[currentModuleIndex]?.id,
        overviewId: overviewSections[currentOverviewIndex]?.id,
      }))
    } catch {
      // Resume state is optional when browser storage is unavailable.
    }

    if (updateHash) {
      const hash = mode === 'syntax'
        ? 'syntax-handbook'
        : mode === 'modules'
          ? moduleSections[currentModuleIndex]?.id
          : overviewSections[currentOverviewIndex]?.id
      const nextHash = `#${hash}`
      if (window.location.hash !== nextHash) {
        const method = historyMode === 'replace' ? 'replaceState' : 'pushState'
        history[method](null, '', nextHash)
      }
    }

    if (scroll) {
      courseNavigator?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  guideModeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      showGuideView(button.dataset.guideMode)
    })
  })

  modulePicker?.addEventListener('change', (event) => {
    const nextIndex = moduleSections.findIndex((section) => section.id === event.target.value)
    moveToModule(nextIndex)
  })

  previousModule?.addEventListener('click', () => {
    moveToModule(currentModuleIndex - 1)
  })

  nextModule?.addEventListener('click', () => {
    moveToModule(currentModuleIndex + 1)
  })

  overviewPicker?.addEventListener('change', (event) => {
    const nextIndex = overviewSections.findIndex((section) => section.id === event.target.value)
    moveToOverview(nextIndex)
  })

  previousOverview?.addEventListener('click', () => {
    moveToOverview(currentOverviewIndex - 1)
  })

  nextOverview?.addEventListener('click', () => {
    moveToOverview(currentOverviewIndex + 1)
  })

  const globalViewButtons = [...document.querySelectorAll('[data-global-view]')]
  globalViewButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const view = button.dataset.globalView
      preferredModuleView = view

      showGuideView('modules', { scroll: false })

      selectModuleView(moduleSections[currentModuleIndex], view)

      globalViewButtons.forEach((candidate) => {
        const selected = candidate === button
        candidate.classList.toggle('current', selected)
        candidate.setAttribute('aria-pressed', String(selected))
      })

      moduleSections[currentModuleIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  })

  document.addEventListener('keydown', (event) => {
    if (!event.altKey || !['modules', 'overview'].includes(currentGuideMode)) return
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    if (currentGuideMode === 'modules') moveToModule(currentModuleIndex + direction)
    else moveToOverview(currentOverviewIndex + direction)
  })

  const backToTop = document.querySelector('[data-back-to-top]')
  const updateBackToTop = () => {
    backToTop?.classList.toggle('visible', window.scrollY > 650)
    courseNavigator?.classList.toggle('is-compact', window.scrollY > 360)
  }
  window.addEventListener('scroll', updateBackToTop, { passive: true })
  window.addEventListener('pageshow', updateBackToTop)
  backToTop?.addEventListener('click', () => {
    courseNavigator?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  updateBackToTop()
  window.setTimeout(updateBackToTop, 100)

  const syntaxIndex = document.querySelector('[data-syntax-index]')
  const syntaxSearch = document.querySelector('[data-syntax-search]')
  const syntaxCount = document.querySelector('[data-syntax-count]')
  const syntaxFilters = document.querySelector('[data-syntax-filters]')
  const syntaxPagination = document.querySelector('[data-syntax-pagination]')

  if (syntaxIndex && window.AQLER_SOURCE_GUIDE) {
    const terms = new Map()
    Object.values(window.AQLER_SOURCE_GUIDE).flat().forEach((file) => {
      file.chunks.forEach((chunk) => {
        chunk.syntax?.forEach((note) => {
          if (!terms.has(note.term)) terms.set(note.term, note.explanation)
        })
      })
    })

    const categoryFor = (term) => {
      if (/^(useState|useEffect|useRef|useMemo|React|className|md:|Controlled|React key|Destructured props)/.test(term)) return 'React / UI'
      if (/^(\.from|\.select|\.insert|\.update|\.delete|\.eq|\.is|\.or|\.order|\.limit|\.single|\.maybeSingle|sign|getSession|onAuth|\.unsubscribe)/.test(term)) return 'Supabase'
      if (/^(auth\.|JSON ->|JSONB|USING|WITH CHECK|ON DELETE|Partial|cardinality|Array <@|excluded|NEW)/.test(term)) return 'SQL / RLS'
      if (/^(Deno|fetch|Response|response|JSON\.stringify|Intl|\.formatToParts)/.test(term)) return 'Server / HTTP'
      if (/^(@|&$|var\(|transition|transform)/.test(term)) return 'CSS'
      if (/^(Blob|Object URL|URL\.|document\.|\.appendChild|\.click|\.remove|setTimeout|clearTimeout)/.test(term)) return 'Browser API'
      return 'JavaScript'
    }

    const entries = [...terms.entries()]
      .map(([term, explanation]) => ({ term, explanation, category: categoryFor(term) }))
      .sort((a, b) => a.term.localeCompare(b.term))

    const categories = ['All', ...new Set(entries.map((entry) => entry.category))]
    const syntaxPageSize = 18
    let activeSyntaxCategory = 'All'
    let currentSyntaxPage = 1
    let currentSyntaxSearch = ''

    categories.forEach((categoryName) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = categoryName
      button.setAttribute('aria-pressed', String(categoryName === activeSyntaxCategory))
      button.addEventListener('click', () => {
        activeSyntaxCategory = categoryName
        currentSyntaxPage = 1
        syntaxFilters.querySelectorAll('button').forEach((candidate) => {
          candidate.setAttribute('aria-pressed', String(candidate === button))
        })
        renderSyntaxIndex()
      })
      syntaxFilters?.append(button)
    })

    const renderSyntaxIndex = () => {
      const normalized = currentSyntaxSearch.trim().toLowerCase()
      const filtered = entries.filter((entry) =>
        (activeSyntaxCategory === 'All' || entry.category === activeSyntaxCategory)
        && `${entry.term} ${entry.explanation} ${entry.category}`.toLowerCase().includes(normalized)
      )
      const totalPages = Math.max(1, Math.ceil(filtered.length / syntaxPageSize))
      currentSyntaxPage = Math.min(currentSyntaxPage, totalPages)
      const pageStart = (currentSyntaxPage - 1) * syntaxPageSize
      const visibleEntries = filtered.slice(pageStart, pageStart + syntaxPageSize)

      syntaxIndex.replaceChildren()
      visibleEntries.forEach((entry) => {
        const article = document.createElement('article')
        article.className = 'syntax-entry'
        const header = document.createElement('header')
        const term = document.createElement('code')
        const category = document.createElement('span')
        const explanation = document.createElement('p')
        term.textContent = entry.term
        category.textContent = entry.category
        explanation.textContent = entry.explanation
        header.append(term, category)
        article.append(header, explanation)
        syntaxIndex.append(article)
      })

      if (visibleEntries.length === 0) {
        const empty = document.createElement('p')
        empty.className = 'muted'
        empty.textContent = 'No syntax explanation matches this search and category.'
        syntaxIndex.append(empty)
      }

      if (syntaxCount) {
        syntaxCount.textContent = `${filtered.length} matches · Page ${currentSyntaxPage} of ${totalPages} · ${entries.length} total explanations`
      }

      if (syntaxPagination) {
        const previous = document.createElement('button')
        const position = document.createElement('span')
        const next = document.createElement('button')
        previous.type = 'button'
        previous.textContent = '← Previous'
        previous.disabled = currentSyntaxPage === 1
        next.type = 'button'
        next.textContent = 'Next →'
        next.disabled = currentSyntaxPage === totalPages
        position.textContent = `Page ${currentSyntaxPage} of ${totalPages}`
        previous.addEventListener('click', () => {
          currentSyntaxPage -= 1
          renderSyntaxIndex()
          syntaxCount?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        next.addEventListener('click', () => {
          currentSyntaxPage += 1
          renderSyntaxIndex()
          syntaxCount?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
        syntaxPagination.replaceChildren(previous, position, next)
      }
    }

    syntaxSearch?.addEventListener('input', (event) => {
      currentSyntaxSearch = event.target.value
      currentSyntaxPage = 1
      renderSyntaxIndex()
    })
    renderSyntaxIndex()
  }

  const applyLocationHash = () => {
    const hash = window.location.hash.slice(1)
    const moduleIndex = moduleSections.findIndex((section) => section.id === hash)
    const overviewIndex = overviewSections.findIndex((section) => section.id === hash)

    if (moduleIndex >= 0) {
      currentModuleIndex = moduleIndex
      showGuideView('modules', { scroll: false, updateHash: false })
    } else if (overviewIndex >= 0) {
      currentOverviewIndex = overviewIndex
      showGuideView('overview', { scroll: false, updateHash: false })
    } else if (hash === 'syntax-handbook') {
      showGuideView('syntax', { scroll: false, updateHash: false })
    } else if (hash === 'overview') {
      currentOverviewIndex = 0
      showGuideView('overview', { scroll: false, updateHash: false })
    } else if (!hash && currentGuideMode === 'overview') {
      showGuideView('overview', { scroll: false, updateHash: false })
    } else if (!hash && currentGuideMode === 'syntax') {
      showGuideView('syntax', { scroll: false, updateHash: false })
    } else {
      showGuideView('modules', { scroll: false, updateHash: false })
    }
  }

  window.addEventListener('hashchange', applyLocationHash)
  window.addEventListener('popstate', applyLocationHash)
  applyLocationHash()

  updateProgress()
})
