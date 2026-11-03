---
layout: page
title: projects
permalink: /projects/
description: Short overviews of my research projects.
nav: true
nav_order: 3
---



<!-- pages/projects.md -->
<div class="projects">
  {% assign sorted_items = site.projects | sort: "importance" %}
  {% for project in sorted_items %}
    {% include project_row.liquid %}
  {% endfor %}
</div>
