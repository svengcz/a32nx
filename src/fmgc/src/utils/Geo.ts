import { computeDestinationPoint as geolibDestPoint, getDistance as geolibDistance, getGreatCircleBearing as geolibBearing } from 'geolib';
import { Coordinates } from '@fmgc/flightplanning/data/geo';
import { MathUtils } from '@shared/MathUtils';
import { Leg } from '@fmgc/guidance/lnav/legs/Leg';

const sin = (input: Degrees) => Math.sin(input * (Math.PI / 180));

const asin = (input: Degrees) => Math.asin(input) * (180 / Math.PI);

export class Geo {
    static getDistance(a: Coordinates, b: Coordinates): NauticalMiles {
        // FIXME rm -f geolib ?
        return geolibDistance({ ...a, lon: a.long }, { ...b, lon: b.long }) / 1852;
    }

    static getGreatCircleBearing(a: Coordinates, b: Coordinates): Degrees {
        // FIXME rm -f geolib ?
        return geolibBearing({ ...a, lon: a.long }, { ...b, lon: b.long });
    }

    static computeDestinationPoint(start: Coordinates, distance: NauticalMiles, bearing: DegreesTrue, radius: Metres = 6371000): Coordinates {
        // FIXME rm -f geolib ?
        const a = geolibDestPoint({ ...start, lon: start.long }, distance * 1852, bearing, radius);
        return {
            lat: a.latitude,
            long: a.longitude,
        };
    }

    static distanceToLeg(from: Coordinates, leg: Leg): NauticalMiles {
        const intersections1 = A32NX_Util.bothGreatCircleIntersections(
            from,
            Avionics.Utils.clampAngle(leg.outboundCourse - 90),
            leg.getPathEndPoint(),
            Avionics.Utils.clampAngle(leg.outboundCourse - 180),
        );

        const d1 = Avionics.Utils.computeGreatCircleDistance(from, intersections1[0]);
        const d2 = Avionics.Utils.computeGreatCircleDistance(from, intersections1[1]);

        // We might call this on legs that do not have a defined start point yet, as it depends on their inbound transition, which is what is passing
        // them in to this function.
        // In that case, do not consider the second intersection set.
        if (!leg.getPathStartPoint()) {
            return Math.min(d1, d2);
        }

        const intersections2 = A32NX_Util.bothGreatCircleIntersections(
            from,
            Avionics.Utils.clampAngle(leg.outboundCourse - 90),
            leg.getPathStartPoint(),
            Avionics.Utils.clampAngle(leg.outboundCourse - 180),
        );

        const d3 = Avionics.Utils.computeGreatCircleDistance(from, intersections2[0]);
        const d4 = Avionics.Utils.computeGreatCircleDistance(from, intersections2[1]);

        return Math.min(d1, d2, d3, d4);
    }

    static legIntercept(from: Coordinates, bearing: DegreesTrue, leg: Leg): Coordinates {
        return Geo.doublePlaceBearingIntercept(from, leg.getPathEndPoint(), Avionics.Utils.clampAngle(bearing), Avionics.Utils.clampAngle(leg.outboundCourse - 180));
    }

    static placeBearingPlaceDistanceIntercept(bearingPoint: Coordinates, distancePoint: Coordinates, bearing: DegreesTrue, distance: NauticalMiles): Coordinates {
        const relativeBearing = Geo.getGreatCircleBearing(bearingPoint, distancePoint);
        const distanceBetween = Geo.getDistance(bearingPoint, distancePoint);
        const angleA = Math.abs(MathUtils.diffAngle(relativeBearing, bearing));
        const angleC = angleA > 90 ? asin(distanceBetween * (sin(angleA) / distance)) : 180 - asin(distanceBetween * (sin(angleA) / distance));
        const angleB = 180 - angleA - angleC;
        return Geo.computeDestinationPoint(bearingPoint, Math.abs(sin(angleB) * (distance / sin(angleA))), bearing);
    }

    static doublePlaceBearingIntercept(pointA: Coordinates, pointB: Coordinates, bearingA: DegreesTrue, bearingB: DegreesTrue): Coordinates {
        return A32NX_Util.greatCircleIntersection(pointA, bearingA, pointB, bearingB);

        // const distanceBetween = Geo.getDistance(pointA, pointB);
        // const bearingBetween = Geo.getGreatCircleBearing(pointA, pointB);
        // const angleA = bearingBetween - bearingA;
        // const angleB = bearingB - bearingBetween - 180;
        // const angleC = 180 - angleA - angleB;
        //
        // const dist = Math.sin(angleA * (Math.PI / 180)) * (distanceBetween / Math.sin(angleC * (Math.PI / 180)));
        // return Geo.computeDestinationPoint(pointB, dist, bearingB);
    }
}
