---
layout: page
title: teaching
permalink: /teaching/
description: Materials for courses you taught. Replace this text with your description.
nav: true
nav_order: 6
display_categories: [work, fun]
horizontal: false
---

I have taught the following courses throughout my bachelors, PhD, and postdoc:

[PHYS100 Mechanics & Thermal Physics 1 ](https://programs-courses.uq.edu.au/course.html?course_code=PHYS1001&year=2013), University of Queensland, tutor

[CHEE2003 Fluid and Particle Mechanics](https://programs-courses.uq.edu.au/course.html?course_code=CHEE2003), University of Queensland, tutor

[CHE2161 Mechanics of Fluids](https://www3.monash.edu/pubs/2019handbooks/units/CHE2161.html), Monash University, demonstrator

[CHE3167 Transport phenomena and numerical methods](https://www3.monash.edu/pubs/2019handbooks/units/CHE3167.html), Monash University, demonstrator

[CHE4162 Particle technology](https://www3.monash.edu/pubs/2019handbooks/units/CHE4162.html), Monash University, demonstrator

[CHE6112 Advanced fluid dynamics](https://handbook.monash.edu/2025/units/CHE6112), Monash University, demonstrator

[Vector Analysis](https://applicationspub.unil.ch/interpub/noauth/php/Ud/ficheCours.php?v_enstyid=85180&v_ueid=258&v_etapeid1=21798&v_langue=en&v_isinterne=), UNIL, lecturer

I have also taught an informal course on advanced fluid dynamics at UNIL, and assisted with teaching advanced transport phenomena at MIT. 

Below you can find several resources I've developed to use in teaching. These mostly consist of matlab scripts with dynamic figures, so that one can easily visualise vector fields in 3D.

<!-- pages/teaching.md -->
<div class="projects">
{% if site.enable_project_categories and page.display_categories %}
  <!-- Display categorized teaching -->
  {% for category in page.display_categories %}
  <a id="{{ category }}" href=".#{{ category }}">
    <h2 class="category">{{ category }}</h2>
  </a>
  {% assign categorized_teaching = site.teaching | where: "category", category %}
  {% assign sorted_teaching = categorized_teaching | sort: "importance" %}
  <!-- Generate cards for each teaching item -->
  {% if page.horizontal %}
  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_teaching %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_teaching %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endif %}
  {% endfor %}

{% else %}

<!-- Display teaching without categories -->

{% assign sorted_teaching = site.teaching | sort: "importance" %}

  <!-- Generate cards for each teaching item -->

{% if page.horizontal %}

  <div class="container">
    <div class="row row-cols-1 row-cols-md-2">
    {% for project in sorted_teaching %}
      {% include projects_horizontal.liquid %}
    {% endfor %}
    </div>
  </div>
  {% else %}
  <div class="row row-cols-1 row-cols-md-3">
    {% for project in sorted_teaching %}
      {% include projects.liquid %}
    {% endfor %}
  </div>
  {% endif %}
{% endif %}
</div>
