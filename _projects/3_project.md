---
layout: page
title: Polymer constitutive modelling and filament thinning
description: Constitutive models for flexible and semiflexible polymer solutions, and what capillary filament thinning experiments really measure for polydisperse samples.
img: assets/img/filament_thinning_schematic.png
importance: 3
category: work
related_publications: true
---

When a drop of polymer solution is stretched into a thin liquid bridge, surface tension squeezes it until it breaks. Polymers resist this by stretching, which slows the thinning. Capillary thinning experiments use this to measure a solution's extensional properties, which matter for processes such as inkjet printing, spraying and fibre spinning. I develop constitutive models that predict this thinning from the polymer's molecular properties, and I use them to interpret what the experiments actually measure.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/filament_thinning_schematic.png" title="Capillary thinning" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    In a capillary thinning experiment, surface tension thins the filament, while viscous, inertial and elastic (polymer) stresses resist it.
</div>

**Polydisperse solutions.** Exponential thinning in the elastocapillary regime is usually read as a direct measure of the polymer relaxation time. Real polymer samples, however, contain a whole distribution of molecular weights. With Vincenzo Calabrese, Simon Haward (OIST) and Gareth McKinley (MIT), I built a multi-mode FENE-PM model that explicitly includes the full molecular weight distribution and validated it against experiments on blends of two polystyrene samples. Only chains with a Weissenberg number above the coil-stretch value, $$Wi = \dot{\varepsilon}\tau > 1/2$$, are stretched by the flow and contribute elastic stress. Long, slowly relaxing chains stay stretched the longest, so they dominate the response. The measured thinning timescale therefore reflects this stretched sub-population rather than the whole sample, and it also depends on experimental choices such as pre-stretch and initial filament size {% cite pincus2026numerical %}.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/filament_thinning_stress.png" title="Stress contributions in a bidisperse blend" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    A blend of shorter (PS7) and longer (PS16) polystyrene chains. Left: the shorter chains drop below the coil-stretch threshold (dashed line) early in thinning. Right: the longer chains then carry almost all of the elastic stress balancing capillarity.
</div>

**Semiflexible polymers.** Stiffer polymers such as xanthan gum behave very differently from flexible ones. They shear-thin strongly and thin almost linearly in time rather than exponentially. With Sami Yamani and Gareth McKinley (MIT), I am developing a constitutive equation based on the FENE-Fraenkel spring from my PhD work. It separates chain orientation from chain stretch, each with its own relaxation timescale. When orientation relaxes much more slowly than stretch, the model predicts the linear, rod-like thinning seen for xanthan gum. When the two timescales are similar, it recovers the exponential, elastic thinning of flexible polymers like PEO.

<div class="row justify-content-sm-center">
    <div class="col-sm-10 mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/fene_fraenkel_orientation_stretch.png" title="Orientation and stretch" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    The FENE-Fraenkel dumbbell (left) is described by its orientation tensor S (centre) and its stretch λ (right), which relax on separate timescales.
</div>
