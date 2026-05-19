import { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'
import { evaluateFit } from '../../utils/fitCalculator'
import styles from './GraphAnalysisPage.module.css'

function ScatterPlot({ data, fitResult, axisLabels }) {
  const svgRef       = useRef(null)
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null })

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || data.length === 0) return

    const container = containerRef.current
    const totalW    = container.clientWidth  || 600
    const totalH    = container.clientHeight || 400
    const margin    = { top: 30, right: 30, bottom: 60, left: 65 }
    const width     = totalW - margin.left - margin.right
    const height    = totalH - margin.top  - margin.bottom

    const parsed = data.map((d) => ({
      x:      Number(d.x),
      y:      Number(d.y),
      errorX: Number(d.errorX) || 0,
      errorY: Number(d.errorY) || 0,
    }))

    const xExtent = d3.extent(parsed, (d) => d.x)
    const yExtent = d3.extent(parsed, (d) => d.y)
    const xPad    = (xExtent[1] - xExtent[0]) * 0.12 || 1
    const yPad    = (yExtent[1] - yExtent[0]) * 0.15 || 1

    const xScale = d3.scaleLinear()
      .domain([xExtent[0] - xPad, xExtent[1] + xPad])
      .range([0, width])

    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - yPad, yExtent[1] + yPad])
      .range([height, 0])

    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width',  totalW)
      .attr('height', totalH)
      .attr('class', 'labfisica-scatter-svg')   


    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3.axisBottom(xScale).tickSize(-height).tickFormat('')
      )
      .selectAll('line')
      .attr('stroke', '#D0D9EE')
      .attr('stroke-dasharray', '4,3')

    g.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale).tickSize(-width).tickFormat('')
      )
      .selectAll('line')
      .attr('stroke', '#D0D9EE')
      .attr('stroke-dasharray', '4,3')

    g.selectAll('.grid .domain').remove()

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6))
      .selectAll('text')
      .attr('fill', '#4A5C8A')
      .attr('font-size', '12px')

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .selectAll('text')
      .attr('fill', '#4A5C8A')
      .attr('font-size', '12px')

    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 45)
      .attr('text-anchor', 'middle')
      .attr('fill', '#4A5C8A')
      .attr('font-size', '13px')
      .text(axisLabels.x)

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -50)
      .attr('text-anchor', 'middle')
      .attr('fill', '#4A5C8A')
      .attr('font-size', '13px')
      .text(axisLabels.y)

    const errorGroup = g.append('g').attr('class', 'errors')

    parsed.forEach((d) => {
      if (d.errorY > 0) {
        errorGroup.append('line')
          .attr('x1', xScale(d.x))
          .attr('x2', xScale(d.x))
          .attr('y1', yScale(d.y - d.errorY))
          .attr('y2', yScale(d.y + d.errorY))
          .attr('stroke', '#1D6FA4')
          .attr('stroke-width', 1.5)

        ;[-1, 1].forEach((dir) => {
          errorGroup.append('line')
            .attr('x1', xScale(d.x) - 4)
            .attr('x2', xScale(d.x) + 4)
            .attr('y1', yScale(d.y + dir * d.errorY))
            .attr('y2', yScale(d.y + dir * d.errorY))
            .attr('stroke', '#1D6FA4')
            .attr('stroke-width', 1.5)
        })
      }

      if (d.errorX > 0) {
        errorGroup.append('line')
          .attr('x1', xScale(d.x - d.errorX))
          .attr('x2', xScale(d.x + d.errorX))
          .attr('y1', yScale(d.y))
          .attr('y2', yScale(d.y))
          .attr('stroke', '#1D6FA4')
          .attr('stroke-width', 1.5)

        ;[-1, 1].forEach((dir) => {
          errorGroup.append('line')
            .attr('x1', xScale(d.x + dir * d.errorX))
            .attr('x2', xScale(d.x + dir * d.errorX))
            .attr('y1', yScale(d.y) - 4)
            .attr('y2', yScale(d.y) + 4)
            .attr('stroke', '#1D6FA4')
            .attr('stroke-width', 1.5)
        })
      }
    })

    if (fitResult) {
      const xMin  = xScale.domain()[0]
      const xMax  = xScale.domain()[1]
      const steps = 200
      const curvePoints = d3.range(steps + 1).map((i) => {
        const xi = xMin + (i / steps) * (xMax - xMin)
        return [xScale(xi), yScale(evaluateFit(fitResult, xi))]
      })

      const lineGen = d3.line().curve(d3.curveMonotoneX)

      g.append('path')
        .datum(curvePoints)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', '#0A2463')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', function () {
          return this.getTotalLength()
        })
        .attr('stroke-dashoffset', function () {
          return this.getTotalLength()
        })
        .transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr('stroke-dashoffset', 0)
    }

    g.append('g')
      .selectAll('circle')
      .data(parsed)
      .join('circle')
      .attr('cx', (d) => xScale(d.x))
      .attr('cy', (d) => yScale(d.y))
      .attr('r', 5)
      .attr('fill', '#1D6FA4')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5)
      .style('opacity', 0)
      .on('mouseover', (event, d) => {
        const rect = containerRef.current.getBoundingClientRect()
        setTooltip({
          visible: true,
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top  - 12,
          content: d,
        })
      })
      .on('mousemove', (event) => {
        const rect = containerRef.current.getBoundingClientRect()
        setTooltip((prev) => ({
          ...prev,
          x: event.clientX - rect.left + 12,
          y: event.clientY - rect.top  - 12,
        }))
      })
      .on('mouseout', () => {
        setTooltip((prev) => ({ ...prev, visible: false }))
      })
      .transition()
      .duration(500)
      .delay((_, i) => i * 40)
      .style('opacity', 1)

  }, [data, fitResult, axisLabels])

  return (
    <div ref={containerRef} className={styles.chartContainer}>
      <svg ref={svgRef} className={styles.svg} />

      {tooltip.visible && tooltip.content && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className={styles.tooltipRow}>
            <span>x</span><strong>{tooltip.content.x.toFixed(4)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>y</span><strong>{tooltip.content.y.toFixed(4)}</strong>
          </div>
          {tooltip.content.errorX > 0 && (
            <div className={styles.tooltipRow}>
              <span>err x</span><strong>±{tooltip.content.errorX.toFixed(4)}</strong>
            </div>
          )}
          {tooltip.content.errorY > 0 && (
            <div className={styles.tooltipRow}>
              <span>err y</span><strong>±{tooltip.content.errorY.toFixed(4)}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ScatterPlot