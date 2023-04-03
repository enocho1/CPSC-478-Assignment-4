import os
import sys
import json
import random
import math


PRIMATIVE_OPTIONS = ["sphere", "cylinder", "cone", "box"]

SPECIAL_MATERIALS = ["MYSPECIAL", "PHONGMATERIAL", "CHECKERBOARD"]

REFLECTION_TYPES = ["GLASSREFLECT", "MIRRORREFLECT"]

if len(sys.argv > 1):
    element_count = sys.argv[1]
else:
    element_count = 5
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

def choiceFromList(l):
    return l[math.floor(random.random()*len(l))] 

def randomColour():
    col = []
    for i in range(3):
        col.append(random.random())  # rgb
    return col


def randomMaterial():
    output_material = {"color": randomColour()}
    if (coinFlip):
        return output_material


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