---
layout: page
title: Cell mechanics and nanoparticle-membrane interactions
description: A model of how nanoparticles deform cell membranes, explaining how they adsorb, detach under flow and are taken up by cells, to guide nanomedicine design.
img: assets/img/membrane_endocytosis.png
importance: 2
category: work
related_publications: true
---

Nanoparticles used as drug carriers or imaging agents first meet a cell at its membrane. Whether they stick to the surface, get washed off by blood flow, or are taken up by the cell depends on how they deform that membrane. With Qin M. Qi at MIT, I built a model of many particles adhering to a lipid membrane, balancing adhesion against membrane stretching and bending.

<div class="row justify-content-sm-center">
    <div class="col-sm-5 mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/membrane_geometry.png" title="Particle wrapping geometry" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm-7 mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/membrane_endocytosis.png" title="Endocytosis cycle" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Left: a particle partially wrapped by the membrane. Right: the proposed endocytosis cycle, where the cell slowly adds lipids to relieve tension and complete the wrapping.
</div>

The key finding is that particles affect each other through membrane tension, even when they cover only 0.1% of the surface. With this effect included, the model matches experiments on particle adsorption onto red blood cells and on size-dependent detachment under shear flow. Adding the cell's slow, active regulation of membrane tension also predicts realistic rates of particle uptake {% cite pincus2025nanoparticle %}. The MATLAB code is available on [GitHub](https://github.com/mitqigroup/Pincus_BPJ_2025).
