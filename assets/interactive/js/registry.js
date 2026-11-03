// Every viewer the shell knows about. To add one, drop a module in viewers/
// and list it here; the key is what ?v= in the URL refers to.

import scalar from "./viewers/scalar.js";
import vector from "./viewers/vector.js";
import tensor from "./viewers/tensor.js";
import crossProduct from "./viewers/cross-product.js";
import curve from "./viewers/curve.js";
import surface from "./viewers/surface.js";
import doubleIntegral from "./viewers/double-integral.js";
import scalarField from "./viewers/scalar-field.js";
import vectorField from "./viewers/vector-field.js";
import tensorField from "./viewers/tensor-field.js";
// Disabled until ready (also uncomment the entries below):
// import flowDeformation from "./viewers/flow-deformation.js";
import streamPathStreak from "./viewers/stream-path-streak.js";
import materialDerivative from "./viewers/material-derivative.js";
// import convectedDerivative from "./viewers/convected-derivative.js";

export default {
  scalar,
  vector,
  tensor,
  "cross-product": crossProduct,
  curve,
  surface,
  "double-integral": doubleIntegral,
  "scalar-field": scalarField,
  "vector-field": vectorField,
  "tensor-field": tensorField,
  // "flow-deformation": flowDeformation,
  "stream-path-streak": streamPathStreak,
  "material-derivative": materialDerivative
  // "convected-derivative": convectedDerivative
};
