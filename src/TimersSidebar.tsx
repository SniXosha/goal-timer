import {useState} from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {useTimersStore} from './pages/main/timersState.ts';

export const TimersSidebar = () => {
    const {timers, activeTimerId, createTimer, deleteTimer, setActiveTimerId, updateTimer} = useTimersStore();
    const [collapsed, setCollapsed] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [timerToDelete, setTimerToDelete] = useState<string | null>(null);
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const handleDeleteClick = (id: string) => {
        setTimerToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (timerToDelete) deleteTimer(timerToDelete);
        setDeleteDialogOpen(false);
        setTimerToDelete(null);
    };

    const handleRenameStart = (id: string, currentName: string) => {
        setRenamingId(id);
        setRenameValue(currentName);
    };

    const handleRenameCommit = () => {
        if (renamingId && renameValue.trim()) {
            updateTimer(renamingId, {name: renameValue.trim()});
        }
        setRenamingId(null);
    };

    const timerToDeleteEntry = timers.find(t => t.id === timerToDelete);

    return (
        <Box sx={{display: 'flex', flexShrink: 0, height: '100%'}}>
            {/* Sidebar panel */}
            <Box sx={{
                width: collapsed ? 0 : '20vw',
                minWidth: collapsed ? 0 : 160,
                overflow: 'hidden',
                transition: 'width 0.2s ease, min-width 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                borderRight: collapsed ? 0 : 1,
                borderColor: 'divider',
            }}>
                <Stack direction="row" alignItems="center" px={2} py={1}
                       sx={{borderBottom: 1, borderColor: 'divider', flexShrink: 0}}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{mr: 'auto'}}>Timers</Typography>
                    <IconButton size="small" onClick={createTimer}>
                        <AddIcon fontSize="small"/>
                    </IconButton>
                </Stack>
                <List dense sx={{flex: 1, overflowY: 'auto', overflowX: 'hidden'}}>
                    {timers.map(timer => (
                        <ListItem key={timer.id} disablePadding>
                            {renamingId === timer.id ? (
                                <Box sx={{px: 1, py: 0.5, width: '100%', boxSizing: 'border-box'}}>
                                    <TextField
                                        size="small"
                                        value={renameValue}
                                        onChange={e => setRenameValue(e.target.value)}
                                        onBlur={handleRenameCommit}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleRenameCommit();
                                            if (e.key === 'Escape') setRenamingId(null);
                                        }}
                                        autoFocus
                                        fullWidth
                                    />
                                </Box>
                            ) : (
                                <Box sx={{display: 'flex', width: '100%', alignItems: 'center'}}>
                                    <ListItemButton
                                        selected={timer.id === activeTimerId}
                                        onClick={() => setActiveTimerId(timer.id)}
                                        sx={{flex: 1, minWidth: 0, py: 0.5}}
                                    >
                                        <ListItemText primary={timer.name}/>
                                    </ListItemButton>
                                    <IconButton size="small"
                                                onClick={() => handleRenameStart(timer.id, timer.name)}>
                                        <EditIcon sx={{fontSize: 16}}/>
                                    </IconButton>
                                    <IconButton size="small"
                                                disabled={timers.length === 1}
                                                onClick={() => handleDeleteClick(timer.id)}>
                                        <DeleteIcon sx={{fontSize: 16}}/>
                                    </IconButton>
                                </Box>
                            )}
                        </ListItem>
                    ))}
                </List>
            </Box>

            {/* Collapse toggle strip */}
            <Box
                onClick={() => setCollapsed(!collapsed)}
                sx={{
                    width: 16,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRight: 1,
                    borderColor: 'divider',
                    '&:hover': {backgroundColor: 'action.hover'},
                    transition: 'background-color 0.1s',
                }}
            >
                {collapsed ? <ChevronRightIcon sx={{fontSize: 14}}/> : <ChevronLeftIcon sx={{fontSize: 14}}/>}
            </Box>

            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Delete timer</DialogTitle>
                <DialogContent>
                    Delete "{timerToDeleteEntry?.name}"? This cannot be undone.
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                    <Button color="error" variant="contained" onClick={handleDeleteConfirm}>Delete</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
