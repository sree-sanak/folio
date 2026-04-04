// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

/**
 * @title CollarOracle
 * @notice Stores collar parameters computed by the Folio CRE workflow.
 *         The CRE workflow reads Chainlink Price Feeds, fetches volatility
 *         via Confidential HTTP, computes collar bounds, and writes here.
 */
contract CollarOracle {
    struct CollarParams {
        uint256 price;        // asset price (8 decimals, from Chainlink)
        uint256 floor;        // collar floor (8 decimals)
        uint256 cap;          // collar cap (8 decimals)
        uint256 volatility;   // implied volatility (basis points, e.g. 4500 = 45%)
        uint256 updatedAt;    // timestamp of last update
    }

    // asset symbol hash => collar params
    mapping(bytes32 => CollarParams) public collars;

    // Chainlink price feed references (for on-chain verification)
    mapping(bytes32 => address) public priceFeeds;

    // Authorized CRE forwarder address
    address public forwarder;
    address public owner;

    // Collar configuration (basis points)
    uint256 public constant FLOOR_BPS = 500;   // 5% below spot
    uint256 public constant CAP_BPS = 1500;    // 15% above spot

    event CollarUpdated(
        string symbol,
        uint256 price,
        uint256 floor,
        uint256 cap,
        uint256 volatility,
        uint256 timestamp
    );

    event PriceFeedSet(string symbol, address feed);

    modifier onlyForwarderOrOwner() {
        require(
            msg.sender == forwarder || msg.sender == owner,
            "CollarOracle: unauthorized"
        );
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "CollarOracle: not owner");
        _;
    }

    constructor(address _forwarder) {
        owner = msg.sender;
        forwarder = _forwarder;
    }

    /**
     * @notice Set a Chainlink price feed for an asset
     */
    function setPriceFeed(string calldata symbol, address feed) external onlyOwner {
        bytes32 key = keccak256(abi.encodePacked(symbol));
        priceFeeds[key] = feed;
        emit PriceFeedSet(symbol, feed);
    }

    /**
     * @notice Update collar parameters — called by CRE workflow via forwarder
     * @param symbol Asset symbol (e.g. "ETH", "BTC")
     * @param price Current price from Chainlink feed (8 decimals)
     * @param volatility Implied volatility in basis points
     */
    function updateCollar(
        string calldata symbol,
        uint256 price,
        uint256 volatility
    ) external onlyForwarderOrOwner {
        bytes32 key = keccak256(abi.encodePacked(symbol));

        uint256 floor = price * (10000 - FLOOR_BPS) / 10000;
        uint256 cap = price * (10000 + CAP_BPS) / 10000;

        collars[key] = CollarParams({
            price: price,
            floor: floor,
            cap: cap,
            volatility: volatility,
            updatedAt: block.timestamp
        });

        emit CollarUpdated(symbol, price, floor, cap, volatility, block.timestamp);
    }

    /**
     * @notice Batch update multiple collars in one tx
     */
    function updateCollars(
        string[] calldata symbols,
        uint256[] calldata prices,
        uint256[] calldata volatilities
    ) external onlyForwarderOrOwner {
        require(
            symbols.length == prices.length && prices.length == volatilities.length,
            "CollarOracle: length mismatch"
        );

        for (uint256 i = 0; i < symbols.length; i++) {
            bytes32 key = keccak256(abi.encodePacked(symbols[i]));

            uint256 floor = prices[i] * (10000 - FLOOR_BPS) / 10000;
            uint256 cap = prices[i] * (10000 + CAP_BPS) / 10000;

            collars[key] = CollarParams({
                price: prices[i],
                floor: floor,
                cap: cap,
                volatility: volatilities[i],
                updatedAt: block.timestamp
            });

            emit CollarUpdated(symbols[i], prices[i], floor, cap, volatilities[i], block.timestamp);
        }
    }

    /**
     * @notice Read collar params for an asset
     */
    function getCollar(string calldata symbol) external view returns (CollarParams memory) {
        bytes32 key = keccak256(abi.encodePacked(symbol));
        return collars[key];
    }

    /**
     * @notice Read the latest price from a Chainlink feed directly
     */
    function getLatestPrice(string calldata symbol) external view returns (int256, uint256) {
        bytes32 key = keccak256(abi.encodePacked(symbol));
        address feed = priceFeeds[key];
        require(feed != address(0), "CollarOracle: no feed");

        (, int256 answer, , uint256 updatedAt, ) = AggregatorV3Interface(feed).latestRoundData();
        return (answer, updatedAt);
    }

    /**
     * @notice Update forwarder address
     */
    function setForwarder(address _forwarder) external onlyOwner {
        forwarder = _forwarder;
    }
}
