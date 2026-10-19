// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Stores non-identifying booking event commitments. Never pass personal data here.
contract BookingProofRegistry {
    address public owner;
    address public relayer;

    mapping(bytes32 bookingKey => mapping(bytes32 eventHash => bool)) public verified;

    event BookingEventRecorded(
        bytes32 indexed bookingKey,
        bytes32 indexed eventHash,
        uint64 recordedAt
    );
    event RelayerChanged(address indexed previousRelayer, address indexed newRelayer);

    error Unauthorized();
    error ZeroAddress();
    error DuplicateProof();

    constructor(address initialRelayer) {
        if (initialRelayer == address(0)) revert ZeroAddress();
        owner = msg.sender;
        relayer = initialRelayer;
    }

    function setRelayer(address newRelayer) external {
        if (msg.sender != owner) revert Unauthorized();
        if (newRelayer == address(0)) revert ZeroAddress();
        emit RelayerChanged(relayer, newRelayer);
        relayer = newRelayer;
    }

    function recordBookingEvent(bytes32 bookingKey, bytes32 eventHash) external {
        if (msg.sender != relayer) revert Unauthorized();
        if (verified[bookingKey][eventHash]) revert DuplicateProof();
        verified[bookingKey][eventHash] = true;
        emit BookingEventRecorded(bookingKey, eventHash, uint64(block.timestamp));
    }
}
