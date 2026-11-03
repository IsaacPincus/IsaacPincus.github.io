---
layout: page
title: Biofilm growth in porous media
description: OpenFOAM simulations of biofilm growth in porous media, coupling nutrient transport and bacterial growth with flow-driven deformation and detachment.
img: assets/img/biofilm_growth.png
importance: 5
category: work
---

Bacteria in soils, filters and other porous materials grow as biofilms: colonies embedded in a soft, self-produced matrix. As biofilms grow they clog pores and redirect the flow, and in turn the flow brings in nutrients and shears biofilm away. With Prof. [Pietro de Anna](https://pietrodeanna.org/pda/) at the University of Lausanne, I develop simulations that capture this two-way coupling between biology and fluid mechanics at the pore scale.

<div style="max-width: 640px; margin: 0 auto;">
  <figure style="margin: 0;">
    <video width="100%" controls autoplay loop muted playsinline poster="{{ site.baseurl }}/assets/img/biofilm_growth.png">
      <source src="{{ site.baseurl }}/assets/video/B_growth.webm" type="video/webm">
      <source src="{{ site.baseurl }}/assets/video/B_growth_web.mp4" type="video/mp4">
      Your browser doesn't support video playback.
    </video>
  </figure>
</div>
<div class="caption" style="text-align: center;">
    Simulated biofilm growth (green, biomass fraction B) around pillars in a porous micromodel over about 95 hours. Biofilm fills the pore space while the flow carves out preferential channels (blue).
</div>

### The model

The simulations use **[BiofilmGrowthFoam](https://github.com/IsaacPincus/BiofilmGrowthFoam)**, a set of custom solvers I wrote for [OpenFOAM](https://www.openfoam.com/). Biofilm growth happens over hours, but the biofilm deforms and detaches under flow within seconds. The code exploits this separation of timescales by alternating two solvers on a shared mesh:

- **Growth (`biomassGrowthFoam`):** nutrient (substrate) is carried by the flow, diffuses, and is consumed by bacteria. Biomass grows with Monod kinetics and spreads by a nonlinear, density-dependent diffusion (following Eberl _et al._, 2001). This gives sharp colony edges and stops the biofilm from packing beyond its maximum density. A signalling molecule (autoinducer) is also tracked to model quorum sensing.
- **Mechanics (`biofilmYieldFoam`):** the biofilm and water are treated as a two-phase volume-of-fluid flow. The biofilm is a Herschel–Bulkley yield-stress material whose yield stress varies in space. Where the shear from the flow exceeds the local yield stress, the biofilm deforms and is washed away.

The two parts are linked through the yield stress. It scales with the local amount of biomass, but drops when the biofilm is dense, starved of nutrients and has built up a high autoinducer concentration. This mimics quorum-sensing-triggered dispersal, where a mature biofilm deliberately weakens and releases cells. The flow field from the mechanics step then drives nutrient and signal transport in the next growth step.
