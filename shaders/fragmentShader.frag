// set the precision of the float values (necessary if using float)
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
precision mediump int;

// flag for using soft shadows (set to 1 only when using soft shadows)
#define SOFT_SHADOWS 0

// define number of soft shadow samples to take
#define SOFT_SAMPLING 3

// define constant parameters
// EPS is for the precision issue
#define INFINITY 1.0e+12
#define EPS 1.0e-3

// define maximum recursion depth for rays
#define MAX_RECURSION 8

// define constants for scene setting
#define MAX_LIGHTS 10

// define texture types
#define NONE 0
#define CHECKERBOARD 1
#define MYSPECIAL 2

// define material types
#define BASICMATERIAL 1
#define PHONGMATERIAL 2
#define LAMBERTMATERIAL 3

// define reflect types - how to bounce rays
#define NONEREFLECT 1
#define MIRRORREFLECT 2
#define GLASSREFLECT 3

struct Shape {
  int shapeType;
  vec3 v1;
  vec3 v2;
  float rad;
};

struct Material {
  int materialType;
  vec3 color;
  float shininess;
  vec3 specular;

  int materialReflectType;
  float reflectivity;
  float refractionRatio;
  int special;
};

struct Object {
  Shape shape;
  Material material;
};

struct Light {
  vec3 position;
  vec3 color;
  float intensity;
  float attenuate;
};

struct Ray {
  vec3 origin;
  vec3 direction;
};

struct Intersection {
  vec3 position;
  vec3 normal;
};

// uniform
uniform mat4 uMVMatrix;
uniform int frame;
uniform float height;
uniform float width;
uniform vec3 camera;
uniform int numObjects;
uniform int numLights;
uniform Light lights[MAX_LIGHTS];
uniform vec3 objectNorm;

// varying
varying vec2 v_position;

// find then position some distance along a ray
vec3 rayGetOffset(Ray ray, float dist) {
  return ray.origin + (dist * ray.direction);
}

// if a newly found intersection is closer than the best found so far, record
// the new intersection and return true; otherwise leave the best as it was and
// return false.
bool chooseCloserIntersection(
  float dist,
  inout float best_dist,
  inout Intersection intersect,
  inout Intersection best_intersect
) {
  if(best_dist <= dist)
    return false;
  best_dist = dist;
  best_intersect.position = intersect.position;
  best_intersect.normal = intersect.normal;
  return true;
}

// put any general convenience functions you want up here
// ----------- STUDENT CODE BEGIN ------------
// ----------- Our reference solution uses 118 lines of code.
// ----------- STUDENT CODE END ------------

// forward declaration
float rayIntersectScene(
  Ray ray,
  out Material out_mat,
  out Intersection out_intersect
);

// Plane
// this function can be used for plane, triangle, and box
float findIntersectionWithPlane(
  Ray ray,
  vec3 norm,
  float dist,
  out Intersection intersect
) {
  float a = dot(ray.direction, norm);
  float b = dot(ray.origin, norm) - dist;

  if(a < EPS && a > -EPS)
    return INFINITY;

  float len = -b / a;
  if(len < EPS)
    return INFINITY;

  intersect.position = rayGetOffset(ray, len);
  intersect.normal = norm;
  return len;
}

bool inTriSide(
  vec3 t1,
  vec3 t2,
  vec3 p,
  vec3 p0
) {
  vec3 v1 = t1 - p;
  vec3 v2 = t2 - p;
  vec3 n1 = cross(v2, v1);
  vec3 v = p - p0;

  return dot(v, n1) > 0.0;
}

// Triangle
float findIntersectionWithTriangle(
  Ray ray,
  vec3 t1,
  vec3 t2,
  vec3 t3,
  out Intersection intersect
) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 28 lines of code.
  //get normal + distance and treat like a plane @enoch
  // vec3 edge1 = t2-t1;
  // vec3 edge2 = t3-t1;
  // vec3 pVec = cross(ray.direction, edge2);
  // float det = dot(pVec, edge1);
  // if(det<EPS){
  //   return INFINITY;
  // }

  vec3 normal = normalize(cross(t2 - t1, t3 - t1));

  vec3 triangleCenter = t1 + t2 + t3;
  triangleCenter /= 3.0;
  float distance = dot(t1, normal);
  Intersection initialIntersection;
  float d = findIntersectionWithPlane(ray, normal, distance, initialIntersection);
  if(d < INFINITY) {
//check within triangle
    if((inTriSide(t1, t2, intersect.position, ray.origin)) && (inTriSide(t2, t3, intersect.position, ray.origin)) && (inTriSide(t3, t1, intersect.position, ray.origin))) {
      intersect.normal = initialIntersection.normal;
      intersect.position = initialIntersection.position;
      return d;
    }
  }

  // currently reports no intersection
  return INFINITY;
  // ----------- STUDENT CODE END ------------
}

// Sphere
float findIntersectionWithSphere(
  Ray ray,
  vec3 center,
  float radius,
  out Intersection intersect
) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 25 lines of code.
  vec3 V = ray.direction;
  vec3 PminusO = ray.origin - center;
  float a = dot(V, V);
  float b = 2.0 * dot(V, PminusO);
  float c = dot(PminusO, PminusO) - radius * radius;

  float discrim = b * b - 4.0 * a * c;

  if(discrim < 0.0) {
    return INFINITY;
  } else {
    float t1 = (-b + sqrt(discrim)) / (2.0 * a);
    float t2 = (-b - sqrt(discrim)) / (2.0 * a);
    float T = min(t1, t2);
    if(T <= EPS) {
      return INFINITY;
    }
    vec3 P = ray.origin + T * V;
    intersect.position = P;
    intersect.normal = normalize(P - center);
    return length(P - center);

  }

  // currently reports no intersection
  return INFINITY;
  // ----------- STUDENT CODE END ------------
}

bool inBox(vec3 p, vec3 pmin, vec3 pmax) {
  bool a = (p.x >= pmin.x - EPS) && (p.y >= pmin.y - EPS) && (p.z >= pmin.z - EPS);
  bool b = (p.x <= pmax.x + EPS) && (p.y <= pmax.y + EPS) && (p.z <= pmax.z + EPS);
  return a && b;
}

// Box
float findIntersectionWithBox(
  Ray ray,
  vec3 pmin,
  vec3 pmax,
  out Intersection out_intersect
) {
  // ----------- STUDENT CODE BEGIN ------------
  // pmin and pmax represent two bounding points of the box
  // pmin stores [xmin, ymin, zmin] and pmax stores [xmax, ymax, zmax]
  // ----------- Our reference solution uses 44 lines of code.

  //normals and distances for each side (normals can just be *-1 for the opposite face)
  vec3 n1 = vec3(1, 0, 0);
  vec3 n2 = vec3(0, 1, 0);
  vec3 n3 = vec3(0, 0, 1);
  float d1 = pmax.x;
  float d2 = pmin.x;
  float d3 = pmax.y;
  float d4 = pmin.y;
  float d5 = pmax.z;
  float d6 = pmin.z;

  //idea, intersect both opposite sides, if i get a hit, check that i didn't get one on the opposite side first then return else, just check the opposite side

  // for the first two opposite faces
  Intersection side_a, side_b;
  float a = findIntersectionWithPlane(ray, n1, d1, side_a);
  float b = findIntersectionWithPlane(ray, -n1, d2, side_b);
  bool p = inBox(side_a.position, pmin, pmax);
  bool q = inBox(side_b.position, pmin, pmax);
  if(p && (a < INFINITY) && (a > 0.0)) {
    if(q && (b < INFINITY) && (b > 0.0) && (b < a)) {
      out_intersect = side_b;
      return b;
    }
    out_intersect = side_a;
    return a;
  } else {
    if(q && (b < INFINITY) && (b > 0.0)) {
      out_intersect = side_b;
      return b;
    }
  }
  // for the next two opposite faces

  a = findIntersectionWithPlane(ray, n2, d3, side_a);
  b = findIntersectionWithPlane(ray, -n2, d4, side_b);
  p = inBox(side_a.position, pmin, pmax);
  q = inBox(side_b.position, pmin, pmax);
  if(p && (a < INFINITY) && (a > 0.0)) {
    if(q && (b < INFINITY) && (b > 0.0) && (b < a)) {
      out_intersect = side_b;
      return b;
    }
    out_intersect = side_a;
    return a;
  } else {
    if(q && (b < INFINITY) && (b > 0.0)) {
      out_intersect = side_b;
      return b;
    }
  }
  // for the last two opposite faces
  //z is flipped for some reason??

  a = findIntersectionWithPlane(ray, n3, d6, side_a);
  b = findIntersectionWithPlane(ray, -n3, d5, side_b);
  p = inBox(side_a.position, pmin, pmax);
  q = inBox(side_b.position, pmin, pmax);
  if(p && (a < INFINITY) && (a > 0.0)) {
    if(q && (b < INFINITY) && (b > 0.0) && (b < a)) {
      out_intersect = side_b;
      return b;
    }
    out_intersect = side_a;
    return a;
  } else {
    if(q && (b < INFINITY) && (b > 0.0)) {
      out_intersect = side_b;
      return b;
    }
  }

  // currently reports no intersection
  return INFINITY;
  // ----------- STUDENT CODE END ------------
}

// Cylinder
float getIntersectOpenCylinder(
  Ray ray,
  vec3 center,
  vec3 axis,
  float len,
  float rad,
  out Intersection intersect
) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 33 lines of code.
  //useful vars
  vec3 vr = ray.direction;
  vec3 va = axis;
  vec3 vd = ray.origin - center;
  float phi = dot(vd, axis);
  float theta = dot(ray.direction, axis);
  vec3 vrMinusva = vr - theta * va;
  vec3 vdMinusva = vd - phi * va;
  float r2 = rad * rad;
  vec3 p1 = center + (len) * normalize(axis);
  vec3 p2 = center;

  //quadratic equation
  float a = length(vrMinusva) * length(vrMinusva);
  float b = 2.0 * dot(vrMinusva, vdMinusva);
  float c = length(vdMinusva) * length(vdMinusva) - r2;

  //check discrim
  float discrim = b * b - 4.0 * a * c;

  if(discrim < 0.0) {
    return INFINITY;
  } else {
    // use result
    float t1 = (-b + sqrt(discrim)) / (2.0 * a);
    float t2 = (-b - sqrt(discrim)) / (2.0 * a);
    float T = min(t1, t2);
    if(T <= EPS) {
      return INFINITY;
    }
    // check cutoffs
    vec3 P = ray.origin + T * vr;
    intersect.position = P;
    vec3 Q = abs(dot(axis, (P - center))) * normalize(axis) + center;
    intersect.normal = normalize(P - Q);
    if((dot(va, (P - p1)) < EPS) && (dot(va, (P - p2)) > EPS)) {
      return length(P - center);
    }

  }

  // currently reports no intersection
  return INFINITY;
  // ----------- STUDENT CODE END ------------
}

float getIntersectDisc(
  Ray ray,
  vec3 center,
  vec3 norm,
  float rad,
  out Intersection intersect
) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 18 lines of code.
  float dist = dot(center, norm);
  float d = findIntersectionWithPlane(ray, norm, dist, intersect);
  if((d >= EPS) && (d < INFINITY)) {
    float l = length(intersect.position - center);
    if(l <= rad && (abs(dot(norm, (intersect.position - center))) <= EPS)) {
      return d;
    }
  }
  // currently reports no intersection
  return INFINITY;
  // ----------- STUDENT CODE END ------------
}

float findIntersectionWithCylinder(
  Ray ray,
  vec3 center,
  vec3 apex,
  float radius,
  out Intersection out_intersect
) {
  vec3 axis = apex - center;
  float len = length(axis);
  axis = normalize(axis);

  Intersection intersect;
  float best_dist = INFINITY;
  float dist;

  // -- infinite cylinder
  dist = getIntersectOpenCylinder(ray, center, axis, len, radius, intersect);
  chooseCloserIntersection(dist, best_dist, intersect, out_intersect);

  // -- two caps
  dist = getIntersectDisc(ray, center, -axis, radius, intersect);
  chooseCloserIntersection(dist, best_dist, intersect, out_intersect);
  dist = getIntersectDisc(ray, apex, axis, radius, intersect);
  chooseCloserIntersection(dist, best_dist, intersect, out_intersect);
  return best_dist;
}

// Cone
float getIntersectOpenCone(
  Ray ray,
  vec3 apex,
  vec3 axis,
  float len,
  float radius,
  out Intersection intersect
) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 45 lines of code.
  //useful vars
  vec3 vr = ray.direction;
  vec3 va = normalize(axis);
  vec3 vd = ray.origin - apex;
  float phi = dot(vd, va);
  float theta = dot(ray.direction, va);
  vec3 vrMinusva = vr - theta * va;
  vec3 vdMinusva = vd - phi * va;
  float r2 = radius * radius;
  float quot = sqrt(len * len + r2);
  float sin2a = r2 / quot;
  float cos2a = len * len / quot;

  //quadratic equation
  float a = dot(vrMinusva, vrMinusva) * cos2a - theta * theta * sin2a;
  float b = 2.0 * (dot(vrMinusva, vdMinusva) * cos2a - theta * phi * sin2a);
  float c = dot(vdMinusva, vdMinusva) * cos2a - phi * phi * sin2a;

  //check discrim
  float discrim = b * b - 4.0 * a * c;

  if(discrim < 0.0) {
    return INFINITY;
  } else {
    // use result
    float t1 = (-b + sqrt(discrim)) / (2.0 * a);
    float t2 = (-b - sqrt(discrim)) / (2.0 * a);
    float T = min(t1, t2);
    if(T <= EPS) {
      return INFINITY;
    }
    // check cutoffs
    vec3 P = ray.origin + T * vr;
    intersect.position = P;
    vec3 C = apex + normalize(va) * len; //center (at the bottom of the cone)
    vec3 ctop = P - C; // c to P, center to the point we've landed on
    vec3 D = normalize(apex - P);
    vec3 W = D * (dot(ctop, D)) / length(D);
    intersect.normal = normalize(ctop - W);
    if((dot(va, -D) >= EPS) && (dot(va, ctop) < EPS)) {
      return length(P - ray.origin);
    }

  }

  // currently reports no intersection
  return INFINITY;
  // ----------- STUDENT CODE END ------------
}

float findIntersectionWithCone(
  Ray ray,
  vec3 center,
  vec3 apex,
  float radius,
  out Intersection out_intersect
) {
  vec3 axis = center - apex;
  float len = length(axis);
  axis = normalize(axis);

  // -- infinite cone
  Intersection intersect;
  float best_dist = INFINITY;
  float dist;

  // -- infinite cone
  dist = getIntersectOpenCone(ray, apex, axis, len, radius, intersect);
  chooseCloserIntersection(dist, best_dist, intersect, out_intersect);

  // -- caps
  dist = getIntersectDisc(ray, center, axis, radius, intersect);
  chooseCloserIntersection(dist, best_dist, intersect, out_intersect);

  return best_dist;
}

vec3 calculateSpecialDiffuseColor(
  Material mat,
  vec3 posIntersection,
  vec3 normalVector
) {
  // ----------- STUDENT CODE BEGIN ------------
  if(mat.special == CHECKERBOARD) {
    // ----------- Our reference solution uses 7 lines of code.
    float x = floor(posIntersection.x * 0.10 + EPS);
    float y = floor(posIntersection.y * 0.10 + EPS);
    float z = floor(posIntersection.z * 0.10 + EPS);
    float s = x + y + z;
    float m = mod(s, 2.0);
    if(m <= EPS) {
      // mat.color *= vec3(0, 0, 0);
      mat.color *=  1.0;
    } else {
      mat.color *= 0.5;
    }

  } else if(mat.special == MYSPECIAL) {
    // ----------- Our reference solution uses 5 lines of code.
  }

  // If not a special material, just return material color.
  return mat.color;
  // ----------- STUDENT CODE END ------------
}

vec3 calculateDiffuseColor(
  Material mat,
  vec3 posIntersection,
  vec3 normalVector
) {
  // Special colors
  if(mat.special != NONE) {
    return calculateSpecialDiffuseColor(mat, posIntersection, normalVector);
  }
  return vec3(mat.color);
}

// check if position pos in in shadow with respect to a particular light.
// lightVec is the vector from that position to that light -- it is not
// normalized, so its length is the distance from the position to the light
bool pointInShadow(vec3 pos, vec3 lightVec) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 15 lines of code.
  Ray r;
  r.origin = pos;
  r.direction = normalize(lightVec);
  float len = length(lightVec);
  Material m;
  Intersection interact;
  float P = rayIntersectScene(r, m, interact);
  float dist = length(r.origin - interact.position);
  return (len - dist >= EPS);
  // return false;
  // ----------- STUDENT CODE END ------------
}

// use random sampling to compute a ratio that represents the
// fractional contribution of the light to the position pos.
// lightVec is the vector from that position to that light -- it is not
// normalized, so its length is the distance from the position to the light
float softShadowRatio(vec3 pos, vec3 lightVec) {
  // ----------- STUDENT CODE BEGIN ------------
  // ----------- Our reference solution uses 19 lines of code.
  return 0.0;
  // ----------- STUDENT CODE END ------------
}

vec3 getLightContribution(
  Light light,
  Material mat,
  vec3 posIntersection,
  vec3 normalVector,
  vec3 eyeVector,
  bool phongOnly,
  vec3 diffuseColor
) {
  vec3 lightVector = light.position - posIntersection;

  float ratio = 1.0; // default to 1.0 for hard shadows
  if(SOFT_SHADOWS == 1) {
    // if using soft shadows, call softShadowRatio to determine
    // fractional light contribution
    ratio = softShadowRatio(posIntersection, lightVector);
  } else {
    // check if point is in shadow with light vector
    if(pointInShadow(posIntersection, lightVector)) {
      return vec3(0.0, 0.0, 0.0);
      // return vec3(1.0, 0.0, 0.0);
    }
  }

  // Slight optimization for soft shadows
  if(ratio < EPS) {
    return vec3(0.0, 0.0, 0.0);
  }

  // normalize the light vector for the computations below
  float distToLight = length(lightVector);
  lightVector /= distToLight;

  if(mat.materialType == PHONGMATERIAL ||
    mat.materialType == LAMBERTMATERIAL) {
    vec3 contribution = vec3(0.0, 0.0, 0.0);

    // get light attenuation
    float attenuation = light.attenuate * distToLight;
    float diffuseIntensity = max(0.0, dot(normalVector, lightVector)) * light.intensity;

    // glass and mirror objects have specular highlights but no diffuse lighting
    if(!phongOnly) {
      contribution += diffuseColor * diffuseIntensity * light.color / attenuation;
    }

    if(mat.materialType == PHONGMATERIAL) {
      // Start with just black by default (i.e. no Phong term contribution)
      vec3 phongTerm = vec3(0.0, 0.0, 0.0);
      // ----------- STUDENT CODE BEGIN ------------
      // ----------- Our reference solution uses 4 lines of code.
      vec3 reflectDir = reflect(normalize(-lightVector), normalVector);
      vec3 viewDir = normalize(eyeVector - posIntersection);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), mat.shininess);
      phongTerm = (spec * mat.specular) * light.color;

      // ----------- STUDENT CODE END ------------
      contribution += phongTerm;
    }

    return ratio * contribution;
  } else {
    return ratio * diffuseColor;
  }
}

vec3 calculateColor(
  Material mat,
  vec3 posIntersection,
  vec3 normalVector,
  vec3 eyeVector,
  bool phongOnly
) {
  // The diffuse color of the material at the point of intersection
  // Needed to compute the color when accounting for the lights in the scene
  vec3 diffuseColor = calculateDiffuseColor(mat, posIntersection, normalVector);

  // color defaults to black when there are no lights
  vec3 outputColor = vec3(0.0, 0.0, 0.0);

  // Loop over the MAX_LIGHTS different lights, taking care not to exceed
  // numLights (GLSL restriction), and accumulate each light's contribution
  // to the point of intersection in the scene.
  // ----------- STUDENT CODE BEGIN ------------
  // @enoch
  for(int i = 0; i < MAX_LIGHTS; i++) {
    if(i >= numLights) {
      break;
    }
    vec3 lightContrib = getLightContribution(lights[i], mat, posIntersection, normalVector, eyeVector, phongOnly, diffuseColor);
    outputColor += lightContrib;
  }

  // ----------- Our reference solution uses 9 lines of code.
  // Return diffuseColor by default, so you can see something for now.
  return outputColor;
  // return diffuseColor;
  // ----------- STUDENT CODE END ------------
}

// find reflection or refraction direction (depending on material type)
vec3 calcReflectionVector(
  Material material,
  vec3 direction,
  vec3 normalVector,
  bool isInsideObj
) {
  if(material.materialReflectType == MIRRORREFLECT) {
    return reflect(direction, normalVector);
  }
  // If it's not mirror, then it is a refractive material like glass.
  // Compute the refraction direction.
  // See lecture 13 slide (lighting) on Snell's law.
  // The eta below is eta_i/eta_r.
  // ----------- STUDENT CODE BEGIN ------------
  float eta = (isInsideObj) ? 1.0 / material.refractionRatio : material.refractionRatio;
  // ----------- Our reference solution uses 5 lines of code.
  vec3 I = direction;
  vec3 N = normalVector;
  float k = 1.0 - eta * eta * (1.0 - dot(N, I) * dot(N, I));
  if(k < 0.0)
    return vec3(0.0);
  else
    return eta * I - (eta * dot(N, I) + sqrt(k)) * N;
  // return refract(direction, normalVector, eta);
  // Return mirror direction by default, so you can see something for now.
  // return reflect(direction, normalVector);
  // ----------- STUDENT CODE END ------------
}

vec3 traceRay(Ray ray) {
  // Accumulate the final color from tracing this ray into resColor.
  vec3 resColor = vec3(0.0, 0.0, 0.0);

  // Accumulate a weight from tracing this ray through different materials
  // based on their BRDFs. Initially all 1.0s (i.e. scales the initial ray's
  // RGB color by 1.0 across all color channels). This captures the BRDFs
  // of the materials intersected by the ray's journey through the scene.
  vec3 resWeight = vec3(1.0, 1.0, 1.0);

  // Flag for whether the ray is currently inside of an object.
  bool isInsideObj = false;

  // Iteratively trace the ray through the scene up to MAX_RECURSION bounces.
  for(int depth = 0; depth < MAX_RECURSION; depth++) {
    // Fire the ray into the scene and find an intersection, if one exists.
    //
    // To do so, trace the ray using the rayIntersectScene function, which
    // also accepts a Material struct and an Intersection struct to store
    // information about the point of intersection. The function returns
    // a distance of how far the ray travelled before it intersected an object.
    //
    // Then, check whether or not the ray actually intersected with the scene.
    // A ray does not intersect the scene if it intersects at a distance
    // "equal to zero" or far beyond the bounds of the scene. If so, break
    // the loop and do not trace the ray any further.
    // (Hint: You should probably use EPS and INFINITY.)
    // ----------- STUDENT CODE BEGIN ------------
    Material hitMaterial;
    Intersection intersect;
    float intersectionDistance = rayIntersectScene(ray, hitMaterial, intersect);
    if((abs(intersectionDistance) <= EPS) || (abs(intersectionDistance) >= INFINITY)) {
      return resColor;
    }

    // ----------- Our reference solution uses 4 lines of code.
    // ----------- STUDENT CODE END ------------

    // Compute the vector from the ray towards the intersection.
    vec3 posIntersection = intersect.position;
    vec3 normalVector = intersect.normal;

    vec3 eyeVector = normalize(ray.origin - posIntersection);

    // Determine whether we are inside an object using the dot product
    // with the intersection's normal vector
    if(dot(eyeVector, normalVector) < 0.0) {
      normalVector = -normalVector;
      isInsideObj = true;
    } else {
      isInsideObj = false;
    }

    // Material is reflective if it is either mirror or glass in this assignment
    bool reflective = (hitMaterial.materialReflectType == MIRRORREFLECT ||
      hitMaterial.materialReflectType == GLASSREFLECT);

    // Compute the color at the intersection point based on its material
    // and the lighting in the scene
    vec3 outputColor = calculateColor(hitMaterial, posIntersection, normalVector, eyeVector, reflective);

    // A material has a reflection type (as seen above) and a reflectivity
    // attribute. A reflectivity "equal to zero" indicates that the material
    // is neither reflective nor refractive.

    // If a material is neither reflective nor refractive...
    // (1) Scale the output color by the current weight and add it into
    //     the accumulated color.
    // (2) Then break the for loop (i.e. do not trace the ray any further).
    // ----------- STUDENT CODE BEGIN ------------
    // ----------- Our reference solution uses 4 lines of code.
    if(hitMaterial.reflectivity < EPS) {
      resColor += resWeight * outputColor; //for some reason adding newcol(scaled by resweight) to rescolour doesn't give the desired result. @enoch

      break;
    }
    // ----------- STUDENT CODE END ------------

    // If the material is reflective or refractive...
    // (1) Use calcReflectionVector to compute the direction of the next
    //     bounce of this ray.
    // (2) Update the ray object with the next starting position and
    //     direction to prepare for the next bounce. You should modify the
    //     ray's origin and direction attributes. Be sure to normalize the
    //     direction vector.
    // (3) Scale the output color by the current weight and add it into
    //     the accumulated color.
    // (4) Update the current weight using the material's reflectivity
    //     so that it is the appropriate weight for the next ray's color.
    // ----------- STUDENT CODE BEGIN ------------
    // ----------- Our reference solution uses 8 lines of code.
    vec3 nextBounceDir = calcReflectionVector(hitMaterial, ray.direction, normalVector, isInsideObj);
    nextBounceDir = normalize(nextBounceDir);
    ray.origin = posIntersection;
    ray.direction = nextBounceDir;
    resColor += resWeight * outputColor;
    resWeight *= hitMaterial.reflectivity;
    // ----------- STUDENT CODE END ------------
  }

  return resColor;
}

void main() {
  float cameraFOV = 0.8;
  vec3 direction = vec3(v_position.x * cameraFOV * width / height, v_position.y * cameraFOV, 1.0);

  Ray ray;
  ray.origin = vec3(uMVMatrix * vec4(camera, 1.0));
  ray.direction = normalize(vec3(uMVMatrix * vec4(direction, 0.0)));

  // trace the ray for this pixel
  vec3 res = traceRay(ray);

  // paint the resulting color into this pixel
  gl_FragColor = vec4(res.x, res.y, res.z, 1.0);
}
