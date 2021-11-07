import { MaxSpeedConstraint } from '@fmgc/guidance/vnav/profile/NavGeometryProfile';
import { VerticalProfileComputationParametersObserver } from '@fmgc/guidance/vnav/VerticalProfileComputationParameters';

/**
 * This class's purpose is to provide a predicted speed at a given position and altitude.
 */
export class ClimbSpeedProfile {
    private maxSpeedCacheHits: number = 0;

    private maxSpeedLookups: number = 0;

    private maxSpeedCache: Map<number, Knots> = new Map();

    private maxSpeedConstraints: MaxSpeedConstraint[];

    private aircraftDistanceAlongTrack: NauticalMiles

    constructor(private observer: VerticalProfileComputationParametersObserver) { }

    updateMaxSpeedConstraints(maxSpeedConstraints: MaxSpeedConstraint[]): ClimbSpeedProfile {
        this.maxSpeedConstraints = maxSpeedConstraints;

        this.maxSpeedCacheHits = 0;
        this.maxSpeedLookups = 0;
        this.maxSpeedCache.clear();

        return this;
    }

    updateDistanceAlongTrack(distanceAlongTrack: NauticalMiles): ClimbSpeedProfile {
        this.aircraftDistanceAlongTrack = distanceAlongTrack;

        return this;
    }

    private isValidSpeedLimit(): boolean {
        const { speed, underAltitude } = this.observer.get().speedLimit;

        return Number.isFinite(speed) && Number.isFinite(underAltitude);
    }

    withSpeedLimitIfApplicable(altitude: Feet, fallbackSpeed: Knots): Knots {
        const { speed, underAltitude } = this.observer.get().speedLimit;

        if (this.isValidSpeedLimit() && altitude < underAltitude) {
            return Math.min(speed, fallbackSpeed);
        }

        return fallbackSpeed;
    }

    get(distanceFromStart: NauticalMiles, altitude: Feet): Knots {
        const { fcuSpeed, flightPhase, preselectedClbSpeed } = this.observer.get();

        const hasPreselectedSpeed = flightPhase < FlightPhase.FLIGHT_PHASE_CLIMB && preselectedClbSpeed > 1;
        const hasSelectedSpeed = fcuSpeed > 1;

        if (!hasPreselectedSpeed && !hasSelectedSpeed) {
            return this.getManaged(distanceFromStart, altitude);
        }

        const nextSpeedChange = this.findDistanceAlongTrackOfNextSpeedChange(this.aircraftDistanceAlongTrack);

        if (distanceFromStart > nextSpeedChange) {
            return this.getManaged(distanceFromStart, altitude);
        }

        if (hasPreselectedSpeed) {
            return preselectedClbSpeed;
        }

        return fcuSpeed;
    }

    getManaged(distanceFromStart: NauticalMiles, altitude: Feet): Knots {
        let managedClimbSpeed = this.observer.get().managedClimbSpeed;

        managedClimbSpeed = this.withSpeedLimitIfApplicable(altitude, managedClimbSpeed);

        return Math.min(managedClimbSpeed, this.findMaxSpeedAtDistanceAlongTrack(distanceFromStart));
    }

    findMaxSpeedAtDistanceAlongTrack(distanceAlongTrack: NauticalMiles): Knots {
        this.maxSpeedLookups++;

        const cachedMaxSpeed = this.maxSpeedCache.get(distanceAlongTrack);
        if (cachedMaxSpeed) {
            this.maxSpeedCacheHits++;
            return cachedMaxSpeed;
        }

        let maxSpeed = Infinity;

        for (const constraint of this.maxSpeedConstraints) {
            if (distanceAlongTrack <= constraint.distanceFromStart && constraint.maxSpeed < maxSpeed) {
                maxSpeed = constraint.maxSpeed;
            }
        }

        this.maxSpeedCache.set(distanceAlongTrack, maxSpeed);

        return maxSpeed;
    }

    private findDistanceAlongTrackOfNextSpeedChange(distanceAlongTrack: NauticalMiles) {
        let distance = Infinity;

        for (const constraint of this.maxSpeedConstraints) {
            if (distanceAlongTrack <= constraint.distanceFromStart && constraint.distanceFromStart < distance) {
                distance = constraint.distanceFromStart;
            }
        }

        // TODO: Handle speed limit

        return distance;
    }

    showDebugStats() {
        if (this.maxSpeedLookups === 0) {
            console.log('[FMS/VNAV] No max speed lookups done so far.');
            return;
        }

        console.log(
            `[FMS/VNAV] Performed ${this.maxSpeedLookups} max speed lookups. Of which ${this.maxSpeedCacheHits} (${100 * this.maxSpeedCacheHits / this.maxSpeedLookups}%) had been cached`,
        );
    }
}
