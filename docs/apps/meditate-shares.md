---
type: App
title: "Meditate to Your Shares"
description: "Generate a sarcastic guided meditation based on a stock or crypto ticker's volatility"
tags: ["app", "finance", "meditation", "parody"]
timestamp: 2026-07-12T00:00:00Z
---

# Meditate to Your Shares

## Concept

A user enters a stock or crypto ticker. The app pulls recent price data and generates a guided meditation that breathes with the market's mood.

## Example

- **Input**: `TSLA`
- **Output**: "Breathe in... as your portfolio bleeds red. Breathe out... and release your attachment to earthly gains and the concept of retirement."

## Data source

Yahoo Finance or equivalent free API for historical prices.

## Model

`@cf/meta/llama-3.2-3b-instruct` with fallback to `@cf/meta/llama-3.2-1b-instruct`.
