import os
import sys
import json
import random
import math

element_count = 5

PRIMITIVE_OPTIONS = ["sphere", "cylinder", "cone", "box"]

SPECIAL_MATERIALS = ["MYSPECIAL", "CHECKERBOARD"]

REFLECTION_TYPES = ["GLASSREFLECT", "MIRRORREFLECT", "NONEREFLECT"]

if len(sys.argv) > 1:
    element_count = int(sys.argv[1])

print(f"generating scene with {element_count} elements...")

ouput_scene = {
    "objects": [],
    "lights": [
        {
            "pos": [-20, 20, 10],
            "color": [1, 1, 1],
            "intensity": 50,
            "attenuate": 1.5
        },
        {
            "pos": [20, 20, 10],
            "color": [1, 1, 1],
            "intensity": 30,
            "attenuate": 2
        },
        {
            "pos": [-10, 20, -20],
            "color": [1, 1, 1],
            "intensity": 30,
            "attenuate": 1
        },
        {
            "pos": [10, 20, -20],
            "color": [1, 1, 1],
            "intensity": 20,
            "attenuate": 1
        }
    ]
}


def coinFlip():
    x = random.rand()
    return x > 0.5


def randomInRange(start, end):
    return random.random()*(end-start)+start


def randomSign():
    if (coinFlip):
        return -1
    else:
        return +1


def choiceFromList(l):
    return l[math.floor(random.random()*len(l))]


def randomColour():
    col = []
    for i in range(3):
        col.append(randomInRange(0.22, 1.1))  # rgb
    return col


def randomPosition():
    return [randomInRange(-40, 20), randomInRange(-40, 20), randomInRange(-40, 20)]


def randomMaterial():
    output_material = {
        "color": randomColour(),
        "shininess": randomInRange(50, 1100),
        "specular": [randomInRange(0.5, 1.01), randomInRange(0.5, 1.01), randomInRange(0.5, 1.01)],
        "reflectType": choiceFromList(REFLECTION_TYPES)
    }
    if (coinFlip):
        output_material["type"] = "PHONGMATERIAL"
    else:
        output_material["special"] = choiceFromList(SPECIAL_MATERIALS)

    if (output_material["reflectType"] != "NONREFLECT"):
        output_material["reflectivity"] = randomInRange(0.4, 1.1)

    return output_material


def generateSphere():
    out = {
        "comment": "// the mirror sphere (for reflection)",
        "type": "sphere",
        "center": randomPosition(),
        "radius": randomInRange(2, 15),
        "material": randomMaterial()
    }
    return out


def generateBox():
    out = {
        "type": "box",
        "minCorner": randomPosition(),
        "maxCorner": [-15, -10, 20],
        "material": {
                "color": randomColour()
        }
    }
    out["maxCorner"] = [out["minCorner"][0] +
                        randomInRange(5, 25), out["minCorner"][1]+10, out["minCorner"][2]+10]
    return out


def generateCone():
    out = {

        "comment": "// the cone",
        "type": "cone",
        "topCenter": randomPosition(),
        "bottomCenter": [-3, -5, 16],
        "radius": randomInRange(2, 15),
        "material": randomMaterial()
    }
    out["bottomCenter"][0] = out["topCenter"][0] + \
        randomInRange(3, 10) * randomSign()
    out["bottomCenter"][1] = out["topCenter"][1] + \
        randomInRange(3, 10) * randomSign()
    out["bottomCenter"][2] = out["topCenter"][2] + \
        randomInRange(3, 10) * randomSign()
    return out


def generateCylinder():
    out = {

        "comment": "// the cylinder",
        "type": "cylinder",
        "topCenter": randomPosition(),
        "bottomCenter": [-3, -5, 16],
        "radius": randomInRange(2, 15),
        "material": randomMaterial()
    }
    out["bottomCenter"][0] = out["topCenter"][0] + \
        randomInRange(3, 10) * randomSign()
    out["bottomCenter"][1] = out["topCenter"][1] + \
        randomInRange(3, 10) * randomSign()
    out["bottomCenter"][2] = out["topCenter"][2] + \
        randomInRange(3, 10) * randomSign()
    return out


def randomPrimitive():
    x = choiceFromList(PRIMITIVE_OPTIONS)
    if x == "sphere":
        return generateSphere()
    elif x == "cylinder":
        return generateCylinder()
    elif x == "cone":
        return generateCone()
    elif x == "box":
        return generateBox()
    else:
        return generateSphere()


walls = [
    {
        "comment": "// the back of the cornell box",
        "type": "plane",
        "normal": [0, 0, 1],
        "dist": 40,
        "material": {
                "color": randomColour(),
                "special": choiceFromList(SPECIAL_MATERIALS)
        }
    },
    {
        "comment": "// the front of the cornell box",
        "type": "plane",
        "normal": [0, 0, -1],
        "dist": 40,
        "material": {
                "color": randomColour()
        }
    },
    {
        "comment": "// the right of the cornell box",
        "type": "plane",
        "normal": [1, 0, 0],
        "dist": 40,
        "material": {
                "color": randomColour()
        }
    },
    {
        "comment": "// the left of the cornell box",
        "type": "plane",
        "normal": [-1, 0, 0],
        "dist": 40,
        "material": {
                "color": randomColour()
        }
    },
    {
        "comment": "// the top of the cornell box",
        "type": "plane",
        "normal": [0, 1, 0],
        "dist": 35,
        "material": {
                "color": randomColour()
        }
    },
    {
        "comment": "// the bottom of the cornell box",
        "type": "plane",
        "normal": [0, -1, 0],
        "dist": 30,
        "material": {
                "type": "PHONGMATERIAL",
                "shininess": 500,
                "color": randomColour(),
                "special": choiceFromList(SPECIAL_MATERIALS)
        }
    }
]

ouput_scene["objects"].extend(walls)

for i in range(element_count):
    ouput_scene["objects"].append(randomPrimitive())

OUTPUT = json.dumps(ouput_scene)

with open("random_scene.json", "w") as F:
    F.write(OUTPUT)
    F.close
print("done.")