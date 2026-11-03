---
layout: page
title: teaching
permalink: /teaching/
description: Courses I've taught and teaching resources I've developed.
nav: true
nav_order: 6
---

I have taught the following courses throughout my bachelors, PhD, and postdoc:

[PHYS100 Mechanics & Thermal Physics 1 ](https://programs-courses.uq.edu.au/course.html?course_code=PHYS1001&year=2013), University of Queensland, tutor

[CHEE2003 Fluid and Particle Mechanics](https://programs-courses.uq.edu.au/course.html?course_code=CHEE2003), University of Queensland, tutor

[CHE2161 Mechanics of Fluids](https://www3.monash.edu/pubs/2019handbooks/units/CHE2161.html), Monash University, demonstrator

[CHE3167 Transport phenomena and numerical methods](https://www3.monash.edu/pubs/2019handbooks/units/CHE3167.html), Monash University, demonstrator

[CHE4162 Particle technology](https://www3.monash.edu/pubs/2019handbooks/units/CHE4162.html), Monash University, demonstrator

[CHE6112 Advanced fluid dynamics](https://handbook.monash.edu/2025/units/CHE6112), Monash University, demonstrator

[Vector Analysis](https://applicationspub.unil.ch/interpub/noauth/php/Ud/ficheCours.php?v_enstyid=85180&v_ueid=258&v_etapeid1=21798&v_langue=en&v_isinterne=), UNIL, lecturer

I have also taught an informal course on advanced fluid dynamics at UNIL, and assisted with teaching advanced transport phenomena at MIT in an unofficial capacity. 

Below you can find several resources I've developed to use in teaching. These mostly consist of matlab scripts with dynamic figures, so that one can easily visualise vector fields in 3D.

<!-- pages/teaching.md -->
<div class="projects">
  {% assign sorted_items = site.teaching | sort: "importance" %}
  {% for project in sorted_items %}
    {% include project_row.liquid %}
  {% endfor %}
</div>
