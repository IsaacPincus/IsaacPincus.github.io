---
layout: page
title: Mesoscale Simulations of Polymer Chains in Flow
description: Brownian dynamics simulations of polymer chains in flow. Coarse-grained models of semiflexible polymers like DNA predict their rheology and flow dichroism.
img: assets/img/BD_shear_render.jpg
importance: 1
category: work
---

The primary focus of my PhD was developing models and simulation tools to predict polymer conformation and rheology in flow. The computational technique is Brownian Dynamics (BD), where we simulate a set of Lagrangian particles representing the backbone of the polymer chain. Rather than simulate the solvent using additional particles or a background mesh, we apply a random force to each particle at each timestep. As one part of the polymer chain can influence another hydrodynamically, the total force on each particle is coupled to the current overall chain conformation.

<div style="max-width: 560px; margin: 0 auto;">
  <figure style="margin: 0;">
    <video width="100%" controls>
      <source src="{{ site.baseurl }}/assets/video/SoR_GoR_2025_Isaac_Pincus.webm#t=11" type="video/webm">
      Your browser doesn't support video playback - you can also view this video at https://www.youtube.com/embed/AVa0PXonQjg?si=q1MrEF5ufQx-9OoX.
    </video>
  </figure>
</div>
<div class="caption" style="text-align: center;">
    My winning entry to the <a href="https://www.societyofrheology.org/">Society of Rheology</a> Gallery of Rheology video showcase at the Santa Fe 2025 meeting.
</div>

My key contribution was developing a coarse-grained model of semiflexible polymer chains (like DNA) which can be used to perform flow simulations. We showed that one can accurately predict the Linear Dichroism (difference in absorption of polarised light) for DNA chains of different lengths in shear flow using our model.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/Coarse_Graining.png" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Different lengths of DNA chains can be represented at different levels of coarse-graining. \( N_s \) is the number of coarse-grained springs used to represent the DNA chain in our model.
</div>

