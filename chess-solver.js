
//==================================================
// Chess solver
// Copyright (C) 2019, ecrucru
// https://github.com/ecrucru/chess-solver/
// License AGPL v3
//==================================================

"use strict";

String.prototype.replaceAll = function(pS, pR) { return this.split(pS).join(pR); };

function chess_solver(pInput)
{
	var	i,
		result = {	candidates	: null,
					headers		: {},
					solution	: null,
					foundMoves	: []
				};

	//-- Fetch the inbound PGN
	var input = pInput.replaceAll("\t", ' ').replaceAll("\r", '').trim();

	//-- Extract the headers
	var	list, item, rxp;
	list = input.split("\n");
	for (i=0 ; i<list.length ; i++)
	{
		item = list[i].trim();

		// Header
		rxp = item.match(/^\[(\w+)\s+\"(.*)\"\]$/);
		if (rxp != null)
		{
			result.headers[rxp[1]] = rxp[2];
			continue;
		}

		// Item
		if (!item.startsWith('['))
		{
			list.splice(0, i);
			input = list.join("\n");
			break;
		}
	}

	//-- Extract the individual moves
	var ilen, b1, b2;
	input = input.replaceAll("\n", ' ').replaceAll('...', '.').replaceAll('.', '. ');
	input = input.replace(/\{[^\}]+\}/g, ' ');				// Kick the comments
	ilen = input.length;
	while (true)											// Kick the analysis lines
	{
		input = input.replace(/(\([^\(\)]+\))/g, ' ');
		if (input.length == ilen)
			break;
		ilen = input.length;
	}
	input = input.replace(/\s+/g, ' ').trim().split(' ');
	for (i=input.length-1 ; i>=0 ; i--)
	{
		b1 = input[i].match(/^[0-9]+\.*$/) || input[i].startsWith('$');
		b2 = (['1-0', '0-1', '1/2-1/2'].indexOf(input[i]) != -1);
		if (b2)
			result.headers.Result = input[i];
		if (b1 || b2)
			input.splice(i, 1);
	}
	if ((input.length == 0) || (input.indexOf('--') == -1))
		return null;

	//-- Exploration
	var board;

	function walk_reset()
	{
		board = new Chess();
		if (result.headers.hasOwnProperty('SetUp') && result.headers.hasOwnProperty('FEN'))
			if (result.headers.SetUp == '1')
				if (!board.load(result.headers.FEN))		// Invalid FEN
					return false;
		result.candidates = [];
		return true;
	}

	function walk(pAllFirstCandidates)
	{
		var first, found, candidates, move, ply_old, ply_new, i, j, s0;
		s0 = board.history().length;
		first = (s0 == 0);
		for (i=s0 ; i<input.length ; i++)
		{
			move = input[i];
			if (move == '--')
			{
				candidates = board.moves();
				if (candidates.length == 0)					// No legal move
					return false;
				found = false;
				for (j=0 ; j<candidates.length ; j++)
				{
					move = candidates[j];
					ply_old = board.history().length;
					board.move(move);
					if (walk(pAllFirstCandidates) !== false)
					{
						found = true;
						if (pAllFirstCandidates && first)
							result.candidates.push(move);
						else
							break;
					}

					// Undo the branch
					ply_new = board.history().length;
					while (ply_new > ply_old)
					{
						board.undo();
						ply_new--;
					}
				}
				if (!found)
					return false;
				break;
			}
			else
				if (board.move(move) == null)
					return false;							// Wrong input from the user
		}
		return true;
	}

	//-- Solver
	if (!walk_reset())
		return null;
	if (walk(false) === false)
		return null;
	result.solution = board.history();
	if (!walk_reset())
		return null;
	walk(true);

	//-- Result
	result.foundMoves = input.slice(0).map(function(p) { return (p == '--'); });
	return result;
}

function chess_ui() 
{
	var	e1 = document.getElementById('chess_solution_first'),
		e2 = document.getElementById('chess_solution_moves'),
		i;

	//-- Solve the problem
	var chess = chess_solver(document.getElementById('chess_input').value);
	if (chess == null)
	{
		e1.innerHTML = '*';
		e2.innerHTML = '*';
		alert('There is no solution to the problem.');
		return false;
	}

	//-- Show the result
	for (i=0 ; i<chess.foundMoves.length ; i++)
		if (chess.foundMoves[i])
			chess.solution[i] = '<span class="chess_highlight">' + chess.solution[i] + '</span>';
	e1.innerHTML = chess.candidates.join(', ');
	e2.innerHTML = chess.solution.join(' ');
	return true;
}
