import {AppBar, Box, Toolbar, Typography} from "@mui/material";
import MainPage from "./pages/main/MainPage.tsx";
import TimerIcon from '@mui/icons-material/Timer';

function App() {
    return (
        <Box
            sx={{
                height: "100vh",
                width: "100%",      // not 100vw
                display: "flex",
                flexDirection: "column",
                overflow: "hidden", // optional, to clip anything that still spills
            }}
        >
            <AppBar position="static" color="transparent" elevation={0}>
                <Toolbar>
                    <TimerIcon sx={{mr: 2}}/>
                    <Typography variant="h6" component="div" sx={{flexGrow: 1}}>
                        Goal Timer
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box
                sx={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <MainPage/>
            </Box>
        </Box>
    )
}

export default App
